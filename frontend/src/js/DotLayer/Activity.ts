/*
 * This module contains definitions for the Activity and ActivityCollection
 *  classes.
 */

import { LatLngBounds } from "../myLeaflet"
import { decode as decodePolyline } from "./Codecs/Polyline"
import {
  uncompressVByteRLEIterator,
  transcode2CompressedBuf,
  decodeDiffList,
  encode2CompressedDiffBuf,
} from "./Codecs/StreamRLE"
import { latLng2pxBounds, latLng2px, tol as dpTol } from "./ViewBox"
import { simplify as simplifyPath } from "./Simplifier"
import { ATYPE } from "../strava"
import { BitSet, hammingWeight } from "../BitSet"
import { RunningStatsCalculator } from "./stats"
// import { quartiles } from "../appUtil.js"

import type { Bounds } from "../appUtil"
import type { RLElist } from "./Codecs/StreamRLE"

interface SegMask extends BitSet {
  zoom?: number
}

type snum = string | number
type tuple2 = [number, number] | Float32Array
type segFunc = (x0: number, y0: number, x1: number, y1: number) => void
type pointFunc = (x: number, y: number) => void

/**
 * We detect anomalous gaps in data by simple statistical analysis of
 * segment lengths.
 *
 * These gaps usually come up when there is a pause in recording
 * while the person in still moving. If the gap is big enough, it
 * results in a long straight line segment that is inaccurate
 * and looks bad.  Sometimes they result from bad GPS reception, in which
 * case they appear as random points far from the activity track.
 *
 * We consider the log of the square distance between two successive points.
 *
 * Any segment that has a Z-Score above ZSCORE_CUTOFF is considered
 * an outlier and removed from the path.
 *
 * @type {Number}
 */
const ZSCORE_CUTOFF = 5

// Alternatively we can use IQR for outlier detection
// It is slower since we must sort the values
const IQR_MULT = 3

type latlng = { lat: number; lng: number }
interface ActivitySpec {
  _id: snum
  type: string
  vtype: string
  name: string
  total_distance: snum
  elapsed_time: snum
  average_speed: snum
  ts: [number, number]
  bounds: { SW: latlng; NE: latlng }
  polyline: string
  time: RLElist
  n: number
}

/**
 * @class Activity
 */
export class Activity {
  id: number
  type: string
  vtype: string
  total_distance: number
  elapsed_time: number
  average_speed: number
  name: string
  _selected: boolean
  tr: HTMLTableRowElement
  colors: { path: string; dot: string }
  ts: number
  tsLocal: Date
  llBounds: LatLngBounds
  pxBounds: Bounds
  idxSet: { [zoom: number]: BitSet }
  badSegIdx: { [zoom: number]: number[] }
  segMask: SegMask
  lastSegMask: SegMask
  _segMaskUpdates: SegMask
  px: Float32Array
  time: ArrayBuffer
  n: number
  pxGaps: number[]
  _containedInMapBounds: boolean

  constructor({
    _id,
    type,
    vtype,
    name,
    total_distance,
    elapsed_time,
    average_speed,
    ts,
    bounds,
    polyline,
    time,
    n,
  }: ActivitySpec) {
    this.id = +_id
    this.type = type
    this.vtype = vtype
    this.total_distance = +total_distance
    this.elapsed_time = +elapsed_time
    this.average_speed = +average_speed
    this.name = name
    this._selected = false
    this.tr = null

    this.colors = {
      // path color is determined by activity type
      path: ATYPE.pathColor(type),

      // dot color is set by a color selecting algorithm later
      dot: null,
    }

    // timestamp comes from backend as a UTC-timestamp, local offset pair
    const [utc, offset] = ts
    this.ts = +utc
    this.tsLocal = new Date((utc + offset * 3600) * 1000)

    this.llBounds = new LatLngBounds(bounds.SW, bounds.NE)
    this.pxBounds = latLng2pxBounds(this.llBounds)

    this.idxSet = {} // BitSets of indices of px for each level of zoom
    this.badSegIdx = {} // locations of gaps in data for each level of zoom
    this.segMask = null // BitSet indicating which segments are in view
    this.pxGaps = null

    // decode polyline format into an Array of [lat, lng] points
    const points = new Float32Array(n * 2)
    const excludeMask = new BitSet(n)

    /*
     * We will compute some stats on interval lengths to
     *  detect anomalous big gaps in the data.
     */
    const dStats = new RunningStatsCalculator()
    const sqDists = []
    const latlngs = decodePolyline(polyline)

    // Set the first point of points to be the projected first latlng pair
    points.set(latLng2px(latlngs.next().value), 0)

    let i = 0 // index of the i-th element of latlngs
    let j = 2 // index of the j-th element of points
    let p1 = points.subarray(0, j)
    for (const latLng of latlngs) {
      i++
      const p2 = latLng2px(latLng)
      const sd = sqDist(p1, p2)
      if (!sd) {
        /*  We ignore any two successive points with zero distance
         *  this might cause problems so look out for it
         */
        excludeMask.add(i)
        continue
      }
      const logSd = Math.log(sd)
      dStats.update(logSd)
      sqDists.push(logSd)

      points.set(p2, j)
      p1 = points.subarray(j, j + 2)
      j = j + 2
    }

    if (sqDists.length + 1 === n) {
      this.px = points
      this.time = transcode2CompressedBuf(time)
    } else {
      n = sqDists.length + 1
      this.px = points.slice(0, n * 2)

      // Some points were discarded so we need to adjust the time diffs
      const it = decodeDiffList(time, 0, excludeMask)
      this.time = encode2CompressedDiffBuf(it)

      // console.log(`${_id}: excluded ${excludeMask.size()} points`)
    }

    this.n = n

    // stdev (Z-score) method for determining outliers
    const dMean = dStats.mean
    const dStdev = dStats.populationStdev
    // const zScores = []
    const devTol = ZSCORE_CUTOFF * dStdev
    const dOutliers = []
    for (let i = 0, len = n - 1; i < len; i++) {
      const dev = sqDists[i] - dMean
      // const zScore = dev / dStdev
      // zScores.push(zScore)
      // if (zScore > ZSCORE_CUTOFF) {
      if (dev > devTol) {
        dOutliers.push(i)
      }
    }

    // // IQR method for determining outliers (it appears to be much slower)
    // const { q3, iqr } = quartiles(sqDists)
    // const upperFence = q3 + IQR_MULT * iqr
    // const dOutliers2 = []
    // for (let i = 0, len = n - 1; i < len; i++) {
    //   if (sqDists[i] > upperFence) {
    //     dOutliers2.push(i)
    //   }
    // }

    if (dOutliers.length) {
      this.pxGaps = dOutliers
      // console.log({dOutliers, dOutliers2})

      // this.selected = true
      // const dist = hist(zScores, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      // console.log({dStats, zScores, dist, dOutliers})
    }
  }

  /**
   * The square distance between to successive points in this.px
   */
  gapAt(idx: number): number {
    return sqDist(this.pointAccessor(idx), this.pointAccessor(idx + 1))
  }

  /**
   * This returns a fuction that provides direct access to the
   * i-th point [x,y] of the location track at a given zoom level.
   *  For any zoom != 0  it uses an index of lookups, which takes
   *  up more memory than the iterator, but it is faster.
   *
   * Each point returned by the accessor function is a window into the
   * actual px array so modifying it will modify the the px array.
   */
  pointAccessor(i: number): Float32Array {
    const j = i * 2
    return this.px.subarray(j, j + 2)
  }

  /**
   * Construct the reduced idxSet for a given zoom-level. An idxSet is a
   * set of indices indicating the subset of px that we will use at the
   * given zoom level.
   */
  makeIdxSet(zoom: number): Activity {
    if (!Number.isFinite(zoom)) {
      throw new TypeError("zoom must be a number")
    }

    if (zoom in this.idxSet) return

    const tol = dpTol(zoom)
    const idxBitSet = simplifyPath(
      (i) => this.pointAccessor(i),
      this.px.length / 2,
      tol
    )
    this.idxSet[zoom] = idxBitSet

    /*
     * this.pxGaps contains the index of the start point of every segment
     *  detemined to have an abnormally large gap.  The simplified index
     *  set for this zoom-level (idxSet[zoom]) may not contain that index,
     *  so we search backwards until we find the index for the start point
     *  of the segment that contains the gap.
     */
    if (this.pxGaps) {
      const gapLocs: number[] = []
      for (let i = this.pxGaps.length - 1; i >= 0; i--) {
        let gapStart = this.pxGaps[i]
        while (!idxBitSet.has(gapStart)) {
          gapStart--
        }
        gapLocs.push(gapStart)
      }

      /*
       * Now we have the index of this.px at the start of a gap,
       *  but we need an index in terms of the reduced (simplified)
       *  index set.  We want j such that gapStart is the j-th element
       *  (set-bit) of idxBitSet.
       */
      gapLocs.sort()
      const badSegIdx = (this.badSegIdx[zoom] = [])

      const idxIter = idxBitSet.imap()
      let nextIdx = idxIter.next()
      let j = 0
      for (const pxIdx of gapLocs) {
        while (!nextIdx.done && nextIdx.value < pxIdx) {
          nextIdx = idxIter.next()
          j++
        }
        badSegIdx.push(j)
      }
    }
    return this
  }

  /*
   * A segMask is a BitSet containing the index of the start-point of
   *  each segment that is in view and is not bad.  A segment is
   *  considered to be in view if one of its points is in the current
   *  view. A "bad" segment is one that represents a gap in GPS data.
   *  The indices are relative to the current zoom's idxSet mask,
   *  so that the i-th good segment corresponds to the i-th member of
   *  this idxSet.
   */
  updateSegMask(viewportPxBounds: Bounds, zoom: number): SegMask {
    /* Later we will compare this segMask with the last one so that we only draw or erase
     * parts of the path that have come into view or are no longer on screen
     */
    if (!this.segMask) {
      this.segMask = new BitSet()
      this.lastSegMask = new BitSet()
      this._segMaskUpdates = new BitSet()
    } else {
      this.lastSegMask = this.segMask.clone(this.lastSegMask)
      this.lastSegMask.zoom = this.segMask.zoom
    }

    this.segMask.zoom = zoom

    // console.log(this.id + "----- updating segmask ---------")
    if (viewportPxBounds.containsBounds(this.pxBounds)) {
      /*
       * If this activity is completely contained in the viewport then we
       * already know every segment is included and we quickly create a full segMask
       */
      if (this._containedInMapBounds) {
        // This is still contained (and was last time)
        this._segMaskUpdates.clear()
        return this.segMask
      }

      const n = this.idxSet[zoom].size()
      this.segMask.clear().resize(n)
      this.segMask.words.fill(~0, 0, n >> 5)
      this.segMask.words[n >> 5] = 2 ** (n % 32) - 1
      this._containedInMapBounds = true
    } else {
      this._containedInMapBounds = false
      const n = this.idxSet[zoom].size()
      const segMask = this.segMask.clear().resize(n)

      let lastpIn
      let i = -1
      this.idxSet[zoom].forEach((idx) => {
        const p = this.pointAccessor(idx)
        const pIn = viewportPxBounds.contains(p[0], p[1])
        /*
         * If either endpoint of the segment is contained in viewport
         * bounds then include this segment index
         */
        if (i++ >= 0 && (lastpIn || pIn)) segMask.add(i)
        lastpIn = pIn
      })
    }

    if (zoom in this.badSegIdx) {
      const badSegIdx = this.badSegIdx[zoom]
      for (const idx of badSegIdx) {
        this.segMask.remove(idx)
      }
    }

    if (!this._containedInMapBounds && this.segMask.isEmpty()) {
      this._segMaskUpdates.clear()
      return
    }

    /*
     * Now we have a current and a last segMask
     */
    const zoomChanged = this.segMask.zoom !== this.lastSegMask.zoom
    if (zoomChanged) {
      this.segMask.clone(this._segMaskUpdates)
      this._segMaskUpdates.zoom = this.segMask.zoom
    } else {
      const newSegs = this.segMask.difference(
        this.lastSegMask,
        this._segMaskUpdates
      )
      /*
       * We include an edge segment (at the edge of the screen)
       * even if it was in the last draw
       */
      const lsm = this.lastSegMask
      let lastSeg
      newSegs.forEach((s) => {
        const beforeGap = lastSeg && lastSeg + 1
        const afterGap = s && s - 1
        if (lastSeg !== afterGap) {
          if (beforeGap && lsm.has(beforeGap)) newSegs.add(beforeGap)
          if (afterGap && lsm.has(afterGap)) newSegs.add(afterGap)
        }
        lastSeg = s
      })
    }

    if (!this.segMask.isEmpty()) return this.segMask
  }

  /**
   * execute a function func(x1, y1, x2, y2) on each currently in-view
   * segment (x1,y1) -> (x2, y2) of this Activity. drawDiff specifies to
   * only use segments that have changed since the last segMask update.
   * Set forceAll to force all currently viewed segments.
   */
  forEachSegment(func: segFunc, drawDiff: boolean): number {
    const segMask = drawDiff ? this._segMaskUpdates : this.segMask
    if (!segMask) return 0

    let count = 0
    const zoom = segMask.zoom
    const idx = this.idxSet[zoom].iterator()
    let lasti: number
    let lastidx2: number
    let lastp2: Float32Array

    segMask.forEach((i) => {
      const reuse = i === lasti + 1
      lasti = i

      const idx1 = reuse ? lastidx2 : idx(i)
      const idx2 = (lastidx2 = idx(i + 1))

      const p1 = reuse ? lastp2 : this.pointAccessor(idx1)
      const p2 = (lastp2 = this.pointAccessor(idx2))
      func(p1[0], p1[1], p2[0], p2[1])
      count++
    })
    return count
  }

  /**
   * execute a function func(x,y) on each dot point of this Activity
   * given time now (in seconds since epoch) and dot Specs.
   */
  forEachDot(
    func: pointFunc,
    nowInSecs: number,
    T: number,
    timeScale: number,
    drawDiff: boolean
  ): number {
    const segMask = drawDiff ? this._segMaskUpdates : this.segMask
    if (!segMask) return 0

    const zoom = segMask.zoom
    const start = this.ts
    const time = uncompressVByteRLEIterator(this.time, 0)
    const idx = this.idxSet[zoom].iterator()

    // we do this because first time is always 0 and time(0) corresponds
    //  to pointAccessor(1)
    let lasti: number
    let lastIdx1: number
    let lastt_b = 0

    let timeOffset: number

    let dummy = true
    let count = 0
    // segMask[i] gives the idx of the start of the i-th segment
    segMask.forEach((i) => {
      const reuse = i === lasti + 1
      lasti = i

      const idx0 = reuse ? lastIdx1 : idx(i)
      const idx1 = (lastIdx1 = idx(i + 1))

      if (idx1 === undefined) return

      const t_a = (reuse) ? lastt_b : time(idx0)
      const t_b = (lastt_b = time(idx1))

      if (dummy) {
        timeOffset = (timeScale * (nowInSecs - (start + t_a))) % T
        dummy = false
      }
      // const timeOffset = (timeScale * (nowInSecs - (start + t_a))) % T

      const lowest = Math.ceil((t_a - timeOffset) / T)
      const highest = Math.floor((t_b - timeOffset) / T)

      if (lowest > highest) return

      const p_a = this.pointAccessor(idx0)
      const p_b = this.pointAccessor(idx1)

      const t_ab = t_b - t_a
      const vx = (p_b[0] - p_a[0]) / t_ab
      const vy = (p_b[1] - p_a[1]) / t_ab

      for (let j = lowest; j <= highest; j++) {
        const t = j * T + timeOffset
        const dt = t - t_a
        if (dt > 0) {
          const x = p_a[0] + vx * dt
          const y = p_a[1] + vy * dt
          func(x, y)
          count++
        }
      }
    })
    return count
  }
}

function sqDist(p1: tuple2, p2: tuple2) {
  const [x1, y1] = p1
  const [x2, y2] = p2
  return (x2 - x1) ** 2 + (y2 - y1) ** 2
}
