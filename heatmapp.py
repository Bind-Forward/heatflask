#! usr/bin/env python

from flask import Flask, render_template, request, g
from sqlalchemy import create_engine
import folium
from folium import plugins
import pandas as pd
import os
from flask_compress import Compress


# Configuration
SQLALCHEMY_DATABASE_URI = os.environ["DATABASE_URL"]
DEBUG = True


app = Flask(__name__)
app.config.from_object(__name__)
Compress(app)


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        engine = create_engine(SQLALCHEMY_DATABASE_URI)
        db = g._database = engine.connect()
    return db


def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/defaultmap')
def blank_map():
    return render_template("defaultmap.html")


@app.route('/map')
def heatmap():
    start = request.args.get('start')
    end = request.args.get('end')

    df = get_points_df(start, end)
    # return googlemap(df)
    # return folium_map(df)
    return leaflet_heatmap(df)


def get_points_df(start=None, end=None):
    # TODO: make sure datetimes are valid and start <= finish

    query = """
            SELECT timestamp, latitude, longitude FROM(
                SELECT unnest(timestamps) AS timestamp,
                       unnest(latitudes) AS latitude,
                       unnest(longitudes) AS longitude FROM activities
                            WHERE begintimestamp >= '%s'
                            AND begintimestamp <= '%s') AS f;

            """ % (start, end)

    df = pd.read_sql(query,
                     con=get_db(),
                     parse_dates=["timestamp"],
                     index_col="timestamp")
    return df


def leaflet_heatmap(df):
    meanlat, meanlong = df.mean()
    t = render_template("leaflet_heatmap.html",
                        data=df.values,
                        zoom=15,
                        center={"lat": meanlat, "lng": meanlong})
    with open("test.html", "w") as f:
        f.write(t)

    return t


def googlemap(df):
    def format_row(row):
        return ("new google.maps.LatLng({}, {})"
                .format(row["latitude"], row["longitude"]))

    data = ",\n".join(df.apply(format_row, axis=1))
    meanlat, meanlong = df.mean()
    return render_template("googlemap_template.html",
                           data=data,
                           zoom=15,
                           center={"lat": meanlat, "lng": meanlong})


def folium_map(df):
    meanlat, meanlong = df.mean()

    heatmap = folium.Map(location=[meanlat, meanlong],
                         control_scale=True,
                         zoom_start=12)

    point_tuples = zip(df.latitude, df.longitude)

    points = [[la, lo] for la, lo in point_tuples]

    cluster = plugins.HeatMap(data=points,
                              name="heatmap",
                              radius=5)

    heatmap.add_children(cluster)

    return heatmap.get_root().render()


if __name__ == '__main__':
    app.run()
