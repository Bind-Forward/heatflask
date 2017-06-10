L.Control.fps=L.Control.extend({lastCalledTime:1,options:{position:"topright"},onAdd:function(map){this._container=L.DomUtil.create('div','leaflet-control-fps');L.DomEvent.disableClickPropagation(this._container);this._container.style.backgroundColor='white';this.update(0);return this._container;},update:function(now=Date.now(),msg=""){let fps=~~(1000/(now-this.lastCalledTime)+0.5);this._container.innerHTML=`${fps}f/s,${msg}`;this.lastCalledTime=now;return fps;}});L.control.fps=function(options){return new L.Control.fps();};function isMobileDevice(){return typeof window.orientation!=="undefined"||navigator.userAgent.indexOf('IEMobile')!==-1;};function hhmmss(secs){return new Date(secs*1000).toISOString().substr(11,8);}
function img(url,w=20,h=20,alt=""){return`<img src=${url}width=${w}px height=${h}px class="img-fluid"alt="${alt}">`;}
function href(url,text){return`<a href='${url}'target='_blank'>${text}</a>`;}
function ip_lookup_url(ip){return ip?"http://freegeoip.net/json/"+ip:"#";}
function stravaActivityURL(id){return"https://www.strava.com/activities/"+id;}
function stravaAthleteURL(id){return"https://www.strava.com/athletes/"+id;}
function formatDate(data,type,row,meta){date=new Date(data);return type==="display"||type==="filter"?date.toLocaleString("en-US",{hour12:false}):date;}
function formatIP(data,type,row,meta){if(data){let ip=data;return type==="display"?href(ip_lookup_url(ip),ip):ip;}else{return"";}}
function formatUserId(data,type,row){if(data){if(type=="display"){return href("/"+data,img(row.profile,w=40,h=40,alt=data));}else{return data;}}else{return"";}}
function formatGroup(data,type,row){if(!data||data==1){return"";}
if(type=="display"){let url=GROUP_ACTIVITY_URL+row.id;return href(url,"<i class='fa fa-users'></i>");}else{return data;}}
function httpGetAsync(theUrl,callback){let xmlHttp=new XMLHttpRequest();xmlHttp.onreadystatechange=function(){if(xmlHttp.readyState==4&&xmlHttp.status==200)callback(xmlHttp.responseText);};xmlHttp.open("GET",theUrl,true);xmlHttp.send(null);}
function httpPostAsync(theUrl,payload,callback){let xmlHttp=new XMLHttpRequest();xmlHttp.onreadystatechange=function(){if(xmlHttp.readyState==4&&xmlHttp.status==200)callback(xmlHttp.responseText);};xmlHttp.open("POST",theUrl,true);xmlHttp.setRequestHeader("Content-type","application/json");dataToSend=JSON.stringify(payload);xmlHttp.send(dataToSend);}
function streamDecode(rle_list,first_value=0){let running_sum=first_value,outArray=[first_value],len=rle_list.length;for(let i=0;i<len;i++){el=rle_list[i];if(el instanceof Array){for(let j=0;j<el[1];j++){running_sum+=el[0];outArray.push(running_sum);}}else{running_sum+=el;outArray.push(running_sum);}}
return outArray;}
function touchHandler(event){var touches=event.changedTouches,first=touches[0],type="";switch(event.type){case"touchstart":type="mousedown";break;case"touchmove":type="mousemove";break;case"touchend":type="mouseup";break;default:return;}
var simulatedEvent=document.createEvent("MouseEvent");simulatedEvent.initMouseEvent(type,true,true,window,1,first.screenX,first.screenY,first.clientX,first.clientY,false,false,false,false,0,null);first.target.dispatchEvent(simulatedEvent);event.preventDefault();}
const SPEED_SCALE=5.0,SEP_SCALE={m:0.14,b:15.0};var map_providers=ONLOAD_PARAMS.map_providers,baseLayers={"None":L.tileLayer("")},default_baseLayer=baseLayers["None"],HeatLayer=false,FlowLayer=false,DotLayer=false,appState={baseLayers:map_providers,paused:ONLOAD_PARAMS.start_paused,items:{},latlngs_flat:[]};if(!OFFLINE){var online_baseLayers={"Esri.WorldImagery":L.tileLayer.provider("Esri.WorldImagery"),"Esri.NatGeoWorldMap":L.tileLayer.provider("Esri.NatGeoWorldMap"),"Stamen.Terrain":L.tileLayer.provider("Stamen.Terrain"),"Stamen.TonerLite":L.tileLayer.provider("Stamen.TonerLite"),"CartoDB.Positron":L.tileLayer.provider("CartoDB.Positron"),"CartoDB.DarkMatter":L.tileLayer.provider("CartoDB.DarkMatter"),"Google.Roadmap":L.gridLayer.googleMutant({type:'roadmap'}),"Google.Terrain":L.gridLayer.googleMutant({type:'terrain'})};Object.assign(baseLayers,online_baseLayers);if(map_providers.length){for(var i=0;i<map_providers.length;i++){provider=map_providers[i];var tl=L.tileLayer.provider(provider);baseLayers[provider]=tl;if(i==0)default_baseLayer=tl;}}else{default_baseLayer=baseLayers["CartoDB.DarkMatter"];}}
var map=L.map('map',{center:ONLOAD_PARAMS.map_center,zoom:ONLOAD_PARAMS.map_zoom,layers:[default_baseLayer],preferCanvas:true,zoomAnimation:false});var sidebarControl=L.control.sidebar('sidebar').addTo(map),zoomControl=map.zoomControl.setPosition('bottomright'),layerControl=L.control.layers(baseLayers,null,{position:'topleft'}).addTo(map),fps_display=ADMIN?L.control.fps().addTo(map):null,areaSelect=null;var animation_button_states=[{stateName:'animation-running',icon:'fa-pause',title:'Pause Animation',onClick:function(btn,map){pauseFlow();updateState();btn.state('animation-paused');}},{stateName:'animation-paused',icon:'fa-play',title:'Resume Animation',onClick:function(btn,map){resumeFlow();if(DotLayer){DotLayer.animate();}
updateState();btn.state('animation-running');}}];var animationControl=L.easyButton({states:appState.paused?animation_button_states.reverse():animation_button_states}).addTo(map);var capture_button_states=[{stateName:'idle',icon:'fa-video-camera',title:'Capture GIF',onClick:function(btn,map){if(!DotLayer){return;}
let size=map.getSize();areaSelect=L.areaSelect({width:200,height:200});areaSelect._width=~~(0.8*size.x);areaSelect._height=~~(0.8*size.y);areaSelect.addTo(map);btn.state('selecting');}},{stateName:'selecting',icon:'fa-object-group',title:'select capture region',onClick:function(btn,map){let size=map.getSize(),w=areaSelect._width,h=areaSelect._height,topLeft={x:Math.round((size.x-w)/2),y:Math.round((size.y-h)/2)},selection={topLeft:topLeft,width:w,height:h};DotLayer.captureCycle(selection=selection,callback=function(){btn.state('idle');areaSelect.remove();});btn.state('capturing');}},{stateName:'capturing',icon:'fa-stop',title:'Stop capturing',onClick:function(btn,map){if(DotLayer&&DotLayer._capturing){DotLayer.abortCapture();areaSelect.remove();btn.state('idle');}}}];var captureControl=L.easyButton({states:capture_button_states});captureControl.enabled=false;$(".dotconst-dial").knob({min:0,max:100,step:0.1,width:"150",height:"150",cursor:20,inline:true,displayInput:false,change:function(val){if(!DotLayer){return;}
let newVal;if(this.$[0].id=="sepConst"){newVal=Math.pow(2,val*SEP_SCALE.m+SEP_SCALE.b);DotLayer.C1=newVal;}else{newVal=val*val*SPEED_SCALE;DotLayer.C2=newVal;}
if(DotLayer._paused){DotLayer.drawLayer(DotLayer._timePaused);}
let cycleDuration=DotLayer.periodInSecs().toFixed(2),captureEnabled=captureControl.enabled;$("#period-value").html(cycleDuration);if(cycleDuration<=CAPTURE_DURATION_MAX){if(!captureEnabled){captureControl.addTo(map);captureControl.enabled=true;}}else if(captureEnabled){captureControl.removeFrom(map);captureControl.enabled=false;}}});$(".dotscale-dial").knob({min:0.01,max:4,step:0.01,width:"100",height:"100",cursor:20,inline:true,displayInput:false,change:function(val){if(!DotLayer){return;}
DotLayer.dotScale=val;if(DotLayer._paused){DotLayer.drawLayer(DotLayer._timePaused);}}});if(FLASH_MESSAGES.length>0){var msg="<ul class=flashes>";for(let i=0,len=FLASH_MESSAGES.length;i<len;i++){msg+="<li>"+FLASH_MESSAGES[i]+"</li>";}
msg+="</ul>";L.control.window(map,{content:msg,visible:true});}
var atable=$('#activitiesList').DataTable({paging:false,scrollY:"60vh",scrollX:true,scrollCollapse:true,order:[[0,"desc"]],select:isMobileDevice()?"multi":"os",data:Object.values(appState.items),idSrc:"id",columns:[{title:'<i class="fa fa-calendar" aria-hidden="true"></i>',data:null,render:A=>href(stravaActivityURL(A.id),A.ts_local.slice(0,10))},{title:"Type",data:"type"},{title:`<i class="fa fa-arrows-h"aria-hidden="true"></i>(${DIST_LABEL})`,data:"total_distance",render:data=>+(data/DIST_UNIT).toFixed(2)},{title:'<i class="fa fa-clock-o" aria-hidden="true"></i>',data:"elapsed_time",render:hhmmss},{title:"Name",data:"name"},{title:'<i class="fa fa-users" aria-hidden="true"></i>',data:"group",render:formatGroup}]}).on('select',handle_table_selections).on('deselect',handle_table_selections);var tableScroller=$('.dataTables_scrollBody');function updateShareStatus(status){console.log("updating share status.");url=`${SHARE_STATUS_UPDATE_URL}?status=${status}`;httpGetAsync(url,function(responseText){console.log(`response:${responseText}`);});}
function handle_table_selections(e,dt,type,indexes){if(type==='row'){var selectedItems=atable.rows({selected:true}).data(),unselectedItems=atable.rows({selected:false}).data();for(var i=0;i<selectedItems.length;i++){if(!selectedItems[i].selected){togglePathSelect(selectedItems[i].id);}}
for(var i=0;i<unselectedItems.length;i++){if(unselectedItems[i].selected){togglePathSelect(unselectedItems[i].id);}}
let c=map.getCenter(),z=map.getZoom();if($("#zoom-table-selection").is(':checked')){zoomToSelected();}
let c2=map.getCenter();if(DotLayer&&c.x==c2.x&&c.y==c2.y&&z==map.getZoom()){DotLayer._onLayerDidMove();}}}
function zoomToSelected(){var selection_bounds=L.latLngBounds();$.each(appState.items,(id,a)=>{if(a.selected){selection_bounds.extend(a.bounds);}});if(selection_bounds.isValid()){map.fitBounds(selection_bounds);}}
function selectedIDs(){return Object.values(appState.items).filter(a=>{return a.selected;}).map(function(a){return a.id;});}
function openSelected(){ids=selectedIDs();if(ids.length>0){var url=BASE_USER_URL+"?id="+ids.join("+");if(appState.paused==true){url+="&paused=1";}
window.open(url,'_blank');}}
function pauseFlow(){DotLayer.pause();appState.paused=true;}
function resumeFlow(){appState.paused=false;if(DotLayer){DotLayer.animate();}}
function highlightPath(id){var A=appState.items[id];if(A.selected)return false;A.highlighted=true;var row=$("#"+id),flow=A.flowLayer;row.addClass('selected');return A;}
function unhighlightPath(id){var A=appState.items[id];if(A.selected)return false;A.highlighted=false;$("#"+id).removeClass('selected');return A;}
function togglePathSelect(id){var A=appState.items[id];if(A.selected){A.selected=false;unhighlightPath(id);}else{highlightPath(id);A.selected=true;}}
function activityDataPopup(id,latlng){var A=appState.items[id],d=parseFloat(A.total_distance),elapsed=hhmmss(parseFloat(A.elapsed_time)),v=parseFloat(A.average_speed);var dkm=+(d/1000).toFixed(2),dmi=+(d/1609.34).toFixed(2),vkm,vmi;if(A.vtype=="pace"){vkm=hhmmss(1000/v).slice(3)+"/km";vmi=hhmmss(1609.34/v).slice(3)+"/mi";}else{vkm=(v*3600/1000).toFixed(2)+"km/hr";vmi=(v*3600/1609.34).toFixed(2)+"mi/hr";}
var popup=L.popup().setLatLng(latlng).setContent(`${A.name}<br>${A.type}:${A.ts_local}<br>`+`${dkm}km(${dmi}mi)in ${elapsed}<br>${vkm}(${vmi})<br>`+`View in<a href='https://www.strava.com/activities/${A.id}'target='_blank'>Strava</a>`+`,<a href='${BASE_USER_URL}?id=${A.id}&flowres=high'target='_blank'>Heatflask</a>`).openOn(map);}
function getBounds(ids=[]){let bounds=L.latLngBounds();for(let i=0;i<ids.length;i++){bounds.extend(appState.items[ids[i]].bounds);}
return bounds;}
function initializeDotLayer(){DotLayer=new L.DotLayer(appState.items,{startPaused:appState.paused});map.addLayer(DotLayer);layerControl.addOverlay(DotLayer,"Dots");$("#sepConst").val((Math.log2(DotLayer.C1)-SEP_SCALE.b)/SEP_SCALE.m).trigger("change");$("#speedConst").val(Math.sqrt(DotLayer.C2)/SPEED_SCALE).trigger("change");$("#dotScale").val(DotLayer.dotScale).trigger("change");setTimeout(function(){$("#period-value").html(DotLayer.periodInSecs().toFixed(2));},500);$("#showPaths").prop("checked",DotLayer.options.showPaths).on("change",function(){DotLayer.options.showPaths=$(this).prop("checked");DotLayer._onLayerDidMove();});}
function renderLayers(){const flowres=$("#flowres").val(),heatres=$("#heatres").val(),date1=$("#date1").val(),date2=$("#date2").val(),type=$("#select_type").val(),num=$("#select_num").val(),lores=flowres=="low"||heatres=="low",hires=flowres=="high"||heatres=="high",idString=type=="activity_ids"?$("#activity_ids").val():null;if(DotLayer){DotLayer.pause();}
if(idString){let streamQuery={},activityIds=idString.split(/\D/).map(Number);streamQuery[USER_ID]={activity_ids:activityIds,summaries:true,streams:hires};httpPostAsync(POST_QUERY_URL,streamQuery,function(data){let key=JSON.parse(data),streamURL=`${KEY_QUERY_URL}${key}`;readStream(streamURL,activityIds.length,updateLayers);});return;}
let inClient=new Set(Object.keys(appState.items).map(Number));activityQuery={limit:type=="activities"?Math.max(1,+num):undefined,after:date1?date1:undefined,before:date2&&date2!="now"?date2:undefined,only_ids:true};let url=QUERY_URL_JSON+"?"+jQuery.param(activityQuery);httpGetAsync(url,function(data){let queryResult=JSON.parse(data)[0];if(queryResult=="build"){activityQuery["only_ids"]=false;activityQuery["summaries"]=true;activityQuery["streams"]=hires;let streamURL=QUERY_URL_SSE+"?"+jQuery.param(activityQuery);readStream(streamURL,null,updateLayers);return;}
let resultSet=new Set(queryResult);for(let item of inClient){if(!resultSet.has(item))delete appState.items[item];}
activityIds=queryResult.filter(id=>!inClient.has(id));if(!activityIds.length){updateLayers();return;}
let streamQuery={};streamQuery[USER_ID]={activity_ids:activityIds,summaries:true,streams:hires};httpPostAsync(POST_QUERY_URL,streamQuery,function(data){let key=JSON.parse(data),streamURL=`${KEY_QUERY_URL}${key}`;readStream(streamURL,activityIds.length,updateLayers);});});}
function updateLayers(msg){if($("#autozoom:checked").val()){let totalBounds=getBounds(Object.keys(appState.items));if(totalBounds.isValid()){map.fitBounds(totalBounds);}}
let num=Object.keys(appState.items).length,msg2=" "+msg+" "+num+" activities rendered.";$(".data_message").html(msg2);if(flowres){if(DotLayer){DotLayer.reset();!appState.paused&&DotLayer.animate();}else{initializeDotLayer();}}else{map.removeLayer(DotLayer);layerControl.removeLayer(DotLayer);DotLayer=false;}
atable.clear();atable.rows.add(Object.values(appState.items)).draw();}
function readStream(streamURL,numActivities=null,callback=null){const flowres=$("#flowres").val(),heatres=$("#heatres").val(),lores=flowres=="low"||heatres=="low",hires=flowres=="high"||heatres=="high";let msgBox=L.control.window(map,{position:'top',content:"<div class='data_message'></div><div><progress class='progbar' id='box'></progress></div>",visible:true}),progress_bars=$('.progbar'),rendering=true,listening=true,source=new EventSource(streamURL),count=0;$(".data_message").html("Rendering activities...");$('#abortButton').click(function(){stopListening();doneRendering("<font color='red'>Aborted:</font>");}).show();$(".progbar").show();$('#renderButton').prop('disabled',true);function doneRendering(msg){if(rendering){appState['date1']=date1;appState["date2"]=date2;appState["flowres"]=flowres;appState["heatres"]=heatres;updateState();$("#abortButton").hide();$(".progbar").hide();try{msgBox.close();}catch(err){console.log(err.message);}
rendering=false;callback&&callback(msg);}}
function stopListening(){if(listening){listening=false;source.close();$('#renderButton').prop('disabled',false);}}
source.onmessage=function(event){if(event.data=='done'){stopListening();doneRendering("Finished.");return;}
let A=JSON.parse(event.data);if(A.error){let msg=`<font color='red'>${A.error}</font><br>`;$(".data_message").html(msg);console.log(`Error activity ${A.id}:${A.error}`);return;}else if(A.msg){$(".data_message").html(A.msg);return;}else if(A.stop_rendering){doneRendering("Done rendering.");return;}
let heatpoints=null,flowpoints=null,hasBounds=A.bounds,bounds=hasBounds?L.latLngBounds(A.bounds.SW,A.bounds.NE):L.latLngBounds();if(hires&&A.polyline){let latLngArray=L.PolylineUtil.decode(A.polyline);if(flowres=="high"&&A.time){let len=latLngArray.length,latLngTime=new Float32Array(3*len),timeArray=streamDecode(A.time);for(let i=0,ll;i<len;i++){ll=latLngArray[i];if(!hasBounds){bounds.extend(ll);}
idx=i*3;latLngTime[idx]=ll[0];latLngTime[idx+1]=ll[1];latLngTime[idx+2]=timeArray[i];}
A.latLngTime=latLngTime;}}
A.startTime=moment(A.ts_UTC||A.ts_local).valueOf();A.bounds=bounds;delete A.summary_polyline;delete A.polyline;delete A.time;if(!(A.id in appState.items)){appState.items[A.id]=A;}
count++;if(numActivities){progress_bars.val(count/numActivities);$(".data_message").html("imported "+count+"/"+numActivities);}else{$(".data_message").html("imported "+count+"/?");}};}
function updateState(){var params={},type=$("#select_type").val(),num=$("#select_num").val();if(type=="activities"){params.limit=num;}else if(type=="activity_ids"){params.id=$("#activity_ids").val();}else if(type=="days"){params.preset=num;}else{if(appState.date1){params.date1=appState.date1;}
if(appState.date2&&appState.date2!="now"){params.date2=appState.date2;}}
if(appState.paused){params.paused="1";}
if($("#info").is(':checked')){appState.info=true;params.info="1";}
if($("#autozoom").is(':checked')){appState.autozoom=true;params.autozoom="1";}else{appState.autozoom=false;var zoom=map.getZoom(),center=map.getCenter(),precision=Math.max(0,Math.ceil(Math.log(zoom)/Math.LN2));params.lat=center.lat.toFixed(precision);params.lng=center.lng.toFixed(precision);params.zoom=zoom;}
if($("#heatres").val()){params.heatres=$("#heatres").val();}
if($("#flowres").val()){params.flowres=$("#flowres").val();}
params["baselayer"]=appState.baseLayers;var newURL=USER_ID+"?"+jQuery.param(params,true);window.history.pushState("","",newURL);$(".current-url").val(newURL);}
function preset_sync(){var F="YYYY-MM-DD",num=$("#select_num").val(),type=$("#select_type").val();$('#query_type').text(type);if(type=="days"){$(".date_select").hide();$("#id_select").hide();$("#num_select").show();$('#date1').val(moment().subtract(num,'days').format(F));$('#date2').val("now");}else if(type=="activities"){$(".date_select").hide();$("#id_select").hide();$("#num_select").show();$('#date1').val("");$('#date2').val("now");}else if(type=="activity_ids"){$(".date_select").hide();$("#num_select").hide();$("#id_select").show();}else{$(".date_select").show();$("#select_num").val("");$("#num_select").hide();$("#id_select").hide();}}
$(document).ready(function(){$("#select_num").keypress(function(event){if(event.which==13){event.preventDefault();renderLayers();}});$("#abortButton").hide();$(".progbar").hide();$(".datepick").datepicker({dateFormat:'yy-mm-dd',changeMonth:true,changeYear:true});map.on('moveend',function(e){if(!appState.autozoom){updateState();}});$("#autozoom").on("change",updateState);$("#info").on("change",updateState);$("#share").prop("checked",SHARE_PROFILE);$("#share").on("change",function(){var status=$("#share").is(":checked")?"public":"private";updateShareStatus(status);});$("#zoom-table-selection").prop("checked",true);$("#zoom-table-selection").on("change",function(){if($("#zoom-table-selection").is(':checked')){zoomToSelected();}});$(".datepick").on("change",function(){$(".preset").val("");});$(".preset").on("change",preset_sync);$("#renderButton").click(renderLayers);$("#render-selection-button").click(openSelected);$("#heatres").val(ONLOAD_PARAMS.heatres);$("#flowres").val(ONLOAD_PARAMS.flowres);$("#autozoom").prop('checked',ONLOAD_PARAMS.autozoom);if(ONLOAD_PARAMS.activity_ids){$("#activity_ids").val(ONLOAD_PARAMS.activity_ids);$("#select_type").val("activity_ids");}else if(ONLOAD_PARAMS.limit){$("#select_num").val(ONLOAD_PARAMS.limit);$("#select_type").val("activities");}else if(ONLOAD_PARAMS.preset){$("#select_num").val(ONLOAD_PARAMS.preset);$("#select_type").val("days");preset_sync();}else{$('#date1').val(ONLOAD_PARAMS.date1);$('#date2').val(ONLOAD_PARAMS.date2);$("#preset").val("");}
renderLayers();preset_sync();});L.DomUtil.setTransform=L.DomUtil.setTransform||function(el,offset,scale){var pos=offset||new L.Point(0,0);el.style[L.DomUtil.TRANSFORM]=(L.Browser.ie3d?"translate("+pos.x+"px,"+pos.y+"px)":"translate3d("+pos.x+"px,"+pos.y+"px,0)")+(scale?" scale("+scale+")":"");};L.DotLayer=(L.Layer?L.Layer:L.Class).extend({_pane:"shadowPane",two_pi:2*Math.PI,target_fps:32,smoothFactor:1.0,_tThresh:100000000.0,C1:1000000.0,C2:200.0,dotScale:1,options:{startPaused:false,showPaths:true,colorAll:true,normal:{dotColor:"#000000",pathColor:"#000000",pathOpacity:0.5,pathWidth:1},selected:{dotColor:"#FFFFFF",dotStrokeColor:"#FFFFFF",pathColor:"#000000",pathOpacity:0.7,pathWidth:1}},initialize:function(items,options){this._map=null;this._dotCanvas=null;this._lineCanvas=null;this._capturing=null;this._dotCtx=null;this._lineCtx=null;this._frame=null;this._items=items||null;this._timeOffset=0;this._colorPalette=[];L.setOptions(this,options);this._paused=this.options.startPaused;this._timePaused=Date.now();},_onLayerDidResize:function(resizeEvent){let newWidth=resizeEvent.newSize.x,newHeight=resizeEvent.newSize.y;this._dotCanvas.width=newWidth;this._dotCanvas.height=newHeight;this._lineCanvas.width=newWidth;this._lineCanvas.height=newHeight;this._onLayerDidMove();},_onLayerDidMove:function(){this._mapMoving=false;let topLeft=this._map.containerPointToLayerPoint([0,0]);this._dotCtx.clearRect(0,0,this._dotCanvas.width,this._dotCanvas.height);L.DomUtil.setPosition(this._dotCanvas,topLeft);this._lineCtx.clearRect(0,0,this._lineCanvas.width,this._lineCanvas.height);L.DomUtil.setPosition(this._lineCanvas,topLeft);this._setupWindow();if(this._paused){this.drawLayer(this._timePaused);}else{this.animate();}},getEvents:function(){var events={movestart:function(){this._mapMoving=true;},moveend:this._onLayerDidMove,resize:this._onLayerDidResize};if(this._map.options.zoomAnimation&&L.Browser.any3d){events.zoomanim=this._animateZoom;}
return events;},onAdd:function(map){this._map=map;let size=this._map.getSize(),zoomAnimated=this._map.options.zoomAnimation&&L.Browser.any3d;this._dotCanvas=L.DomUtil.create("canvas","leaflet-layer");this._dotCanvas.width=size.x;this._dotCanvas.height=size.y;this._dotCtx=this._dotCanvas.getContext("2d");L.DomUtil.addClass(this._dotCanvas,"leaflet-zoom-"+(zoomAnimated?"animated":"hide"));map._panes.shadowPane.style.pointerEvents="none";map._panes.shadowPane.appendChild(this._dotCanvas);this._lineCanvas=L.DomUtil.create("canvas","leaflet-layer");this._lineCanvas.width=size.x;this._lineCanvas.height=size.y;this._lineCtx=this._lineCanvas.getContext("2d");this._lineCtx.lineCap="round";this._lineCtx.lineJoin="round";L.DomUtil.addClass(this._lineCanvas,"leaflet-zoom-"+(zoomAnimated?"animated":"hide"));map._panes.overlayPane.appendChild(this._lineCanvas);map.on(this.getEvents(),this);if(this._items){this.reset();}},reset:function(){let itemsList=Object.values(this._items),numItems=itemsList.length;this._colorPalette=colorPalette(numItems);for(let i=0;i<numItems;i++){itemsList[i].dotColor=this._colorPalette[i];}
this._onLayerDidMove();},onRemove:function(map){this.onLayerWillUnmount&&this.onLayerWillUnmount();map._panes.shadowPane.removeChild(this._dotCanvas);this._dotCanvas=null;map._panes.overlayPane.removeChild(this._lineCanvas);this._lineCanvas=null;map.off(this.getEvents(),this);},addTo:function(map){map.addLayer(this);return this;},LatLonToMercator:function(latlon){return{x:latlon.lng*6378137*Math.PI/180,y:Math.log(Math.tan((90+latlon.lat)*Math.PI/360))*6378137};},_setupWindow:function(){if(!this._map||!this._items){return;}
const perf_t0=performance.now();this._zoom=this._map.getZoom();this._center=this._map.getCenter;this._size=this._map.getSize();this._latLngBounds=this._map.getBounds();this._mapPanePos=this._map._getMapPanePos();this._pxOrigin=this._map.getPixelOrigin();this._pxBounds=this._map.getPixelBounds();this._pxOffset=this._mapPanePos.subtract(this._pxOrigin);var lineCtx=this._lineCtx,z=this._zoom,ppos=this._mapPanePos,pxOrigin=this._pxOrigin,pxBounds=this._pxBounds,items=this._items;this._dotCtx.strokeStyle=this.options.selected.dotStrokeColor;this._zoomFactor=1/Math.pow(2,z);var tThresh=this._tThresh*DotLayer._zoomFactor;this._processedItems={};let pxOffx=this._pxOffset.x,pxOffy=this._pxOffset.y;for(let id in items){if(!items.hasOwnProperty(id)){continue;}
let A=this._items[id];drawingLine=false;if(!A.projected){A.projected={};}
if(A.latLngTime&&this._latLngBounds.overlaps(A.bounds)){let projected=A.projected[z],llt=A.latLngTime;if(!projected){let numPoints=llt.length/3,projectedObjs=new Array(numPoints);for(let i=0,p,idx;i<numPoints;i++){idx=3*i;p=this._map.project([llt[idx],llt[idx+1]]);p.t=llt[idx+2];projectedObjs[i]=p;}
projectedObjs=L.LineUtil.simplify(projectedObjs,this.smoothFactor);let numObjs=projectedObjs.length,projected=new Float32Array(numObjs*3);for(let i=0,obj,idx;i<numObjs;i++){obj=projectedObjs[i];idx=3*i;projected[idx]=obj.x;projected[idx+1]=obj.y;projected[idx+2]=obj.t;}
A.projected[z]=projected;}
projected=A.projected[z];let numProjected=projected.length/3,numSegs=numProjected-1,segGood=new Int8Array(numProjected-2),goodSegCount=0,t0=projected[2],in0=this._pxBounds.contains([projected[0],projected[1]]);for(let i=1,idx;i<numSegs;i++){let idx=3*i,p=projected.slice(idx,idx+3),in1=this._pxBounds.contains([p[0],p[1]]),t1=p[2],isGood=(in0||in1)&&t1-t0<tThresh?1:0;segGood[i-1]=isGood;goodSegCount+=isGood;in0=in1;t0=t1;}
if(goodSegCount==0){continue;}
let dP=new Float32Array(goodSegCount*3);for(let i=0,j=0;i<numSegs;i++){if(segGood[i]){let pidx=3*i,didx=3*j,p=projected.slice(pidx,pidx+6);j++;dP[didx]=pidx;dt=p[5]-p[2];dP[didx+1]=(p[3]-p[0])/dt;dP[didx+2]=(p[4]-p[1])/dt;if(this.options.showPaths){if(!drawingLine){lineCtx.beginPath();drawingLine=true;}
let c1x=~~(p[0]+pxOffx),c1y=~~(p[1]+pxOffy),c2x=~~(p[3]+pxOffx),c2y=~~(p[4]+pxOffy);lineCtx.moveTo(c1x,c1y);lineCtx.lineTo(c2x,c2y);}}}
if(this.options.showPaths){if(drawingLine){lineType=A.highlighted?"selected":"normal";lineCtx.globalAlpha=this.options[lineType].pathOpacity;lineCtx.lineWidth=this.options[lineType].pathWidth;lineCtx.strokeStyle=A.path_color||this.options[lineType].pathColor;lineCtx.stroke();}else{lineCtx.stroke();}}
this._processedItems[id]={dP:dP,P:projected,dotColor:A.dotColor,startTime:A.startTime,totSec:projected.slice(-1)[0]};}}
elapsed=(performance.now()-perf_t0).toFixed(2);},drawDots:function(obj,now,highlighted){var P=obj.P,dP=obj.dP,len_dP=dP.length,totSec=obj.totSec,period=this._period,s=this._timeScale*(now-obj.startTime),xmax=this._size.x,ymax=this._size.y,ctx=this._dotCtx,dotSize=Math.max(1,~~(this.dotScale*Math.log(this._zoom)+0.5)),dotOffset=dotSize/2.0,two_pi=this.two_pi,xOffset=this._pxOffset.x,yOffset=this._pxOffset.y;var timeOffset=s%period,count=0,idx=dP[0],dx=dP[1],dy=dP[2],p=P.slice(idx,idx+3);if(this.options.colorAll||highlighted){ctx.fillStyle=obj.dotColor||this.options.selected.dotColor;}
if(timeOffset<0){timeOffset+=period;}
for(let t=timeOffset,i=0,dt;t<totSec;t+=period){if(t>=P[idx+5]){while(t>=P[idx+5]){i+=3;idx=dP[i];if(i>=len_dP){return count;}}
p=P.slice(idx,idx+3);dx=dP[i+1];dy=dP[i+2];}
dt=t-p[2];if(dt>0){let lx=p[0]+dx*dt+xOffset,ly=p[1]+dy*dt+yOffset;if(lx>=0&&lx<=xmax&&ly>=0&&ly<=ymax){if(highlighted){ctx.beginPath();ctx.arc(~~(lx+0.5),~~(ly+0.5),dotSize,0,two_pi);ctx.fill();ctx.closePath();ctx.stroke();}else{ctx.fillRect(~~(lx-dotOffset+0.5),~~(ly-dotOffset+0.5),dotSize,dotSize);}
count++;}}}
return count;},drawLayer:function(now){if(!this._map){return;}
let ctx=this._dotCtx,zoom=this._zoom,count=0,t0=performance.now(),item,items=this._items,pItem,pItems=this._processedItems,highlighted_items=[],zf=this._zoomFactor;ctx.clearRect(0,0,this._dotCanvas.width,this._dotCanvas.height);ctx.fillStyle=this.options.normal.dotColor;this._timeScale=this.C2*zf;this._period=this.C1*zf;for(let id in pItems){item=pItems[id];if(items[id].highlighted){highlighted_items.push(item);}else{count+=this.drawDots(item,now,false);}}
let hlen=highlighted_items.length;if(hlen){for(let i=0;i<hlen;i++){item=highlighted_items[i];count+=this.drawDots(item,now,true);}}
if(fps_display){let periodInSecs=this.periodInSecs(),progress=(now/1000%periodInSecs).toFixed(1),elapsed=(performance.now()-t0).toFixed(1);fps_display.update(now,`${elapsed}ms/f,n=${count},z=${this._zoom},\nP=${progress}/${periodInSecs.toFixed(2)}`);}},animate:function(){this._paused=false;if(this._timePaused){this._timeOffset=Date.now()-this._timePaused;this._timePaused=null;}
this.lastCalledTime=0;this.minDelay=~~(1000/this.target_fps+0.5);this._frame=L.Util.requestAnimFrame(this._animate,this);},pause:function(){this._paused=true;},_animate:function(){if(!this._frame){return;}
this._frame=null;let ts=Date.now(),now=ts-this._timeOffset;if(this._paused||this._mapMoving){this._timePaused=ts;return;}
if(now-this.lastCalledTime>this.minDelay){this.lastCalledTime=now;this.drawLayer(now);}
this._frame=L.Util.requestAnimFrame(this._animate,this);},_setTransform:function(el,offset,scale){var pos=offset||new L.Point(0,0);el.style[L.DomUtil.TRANSFORM]=(L.Browser.ie3d?"translate("+pos.x+"px,"+pos.y+"px)":"translate3d("+pos.x+"px,"+pos.y+"px,0)")+(scale?" scale("+scale+")":"");},_animateZoom:function(e){var scale=this._map.getZoomScale(e.zoom);var offset=L.Layer?this._map._latLngToNewLayerPoint(this._map.getBounds().getNorthWest(),e.zoom,e.center):this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());L.DomUtil.setTransform(this._dotCanvas,offset,scale);L.DomUtil.setTransform(this._lineCanvas,offset,scale);},periodInSecs:function(){return this._period/(this._timeScale*1000);},captureCycle:function(selection=null,callback=null){let periodInSecs=this.periodInSecs();this._mapMoving=true;this._capturing=true;pd=document.createElement('div');pd.style.position='absolute';pd.style.left=pd.style.top=0;pd.style.backgroundColor='black';pd.style.fontFamily='monospace';pd.style.fontSize='20px';pd.style.padding='5px';pd.style.color='white';pd.style.zIndex=100000;document.body.appendChild(pd);this._progressDisplay=pd;let msg="capturing static map frame...";pd.textContent=msg;leafletImage(this._map,function(err,canvas){console.log("leaflet-image: "+err);if(canvas){this.captureGIF(selection,canvas,periodInSecs,callback=callback);}}.bind(this));},captureGIF:function(selection=null,baseCanvas=null,durationSecs=2,callback=null){this._mapMoving=true;let sx,sy,sw,sh;if(selection){sx=selection.topLeft.x;sy=selection.topLeft.y;sw=selection.width;sh=selection.height;if(baseCanvas){let croppedBaseCanvas=document.createElement('canvas');croppedBaseCanvas.width=sw;croppedBaseCanvas.height=sh;croppedBaseCtx=croppedBaseCanvas.getContext('2d');croppedBaseCtx.drawImage(baseCanvas,sx,sy,sw,sh,0,0,sw,sh);baseCanvas=croppedBaseCanvas;}}else{sx=sy=0;sw=this._size.x;sh=this._size.y;}
let baseCtx=baseCanvas.getContext('2d'),frameCanvas=document.createElement('canvas'),frameCtx=frameCanvas.getContext('2d');frameCanvas.width=sw;frameCanvas.height=sh;let pd=this._progressDisplay,frameTime=Date.now(),frameRate=30,numFrames=durationSecs*frameRate,delay=1000/frameRate,encoder=new GIF({workers:8,quality:8,transparent:'rgba(0,0,0,0)',workerScript:GIFJS_WORKER_URL});this._encoder=encoder;encoder.on('progress',function(p){msg=`Encoding frames...${~~(p*100)}%`;this._progressDisplay.textContent=msg;}.bind(this));encoder.on('finished',function(blob){if(blob){download(blob,"output.gif",'image/gif');}
document.body.removeChild(this._progressDisplay);delete this._progressDisplay;this._mapMoving=false;this._capturing=false;if(!this._paused){this.animate();}
if(callback){callback();}}.bind(this));frameCtx.drawImage(baseCanvas,0,0);this.drawLayer(frameTime);frameCtx.drawImage(this._dotCanvas,sx,sy,sw,sh,0,0,sw,sh);frameTime+=delay;encoder.addFrame(frameCanvas,{copy:true,delay:delay,dispose:1,transparent:null});this._dotCtx.save();this._dotCtx.globalCompositeOperation='source-in';this._dotCtx.drawImage(baseCanvas,0,0,sw,sh,sx,sy,sw,sh);this._dotCtx.restore();baseCtx.clearRect(0,0,sw,sh);baseCtx.drawImage(this._dotCanvas,sx,sy,sw,sh,0,0,sw,sh);for(let i=1,num=Math.round(numFrames);i<num;i++,frameTime+=delay){msg=`Rendering frames...${~~(i/num*100)}%`;pd.textContent=msg;frameCtx.clearRect(0,0,sw,sh);frameCtx.drawImage(baseCanvas,0,0);this.drawLayer(frameTime);frameCtx.drawImage(this._dotCanvas,sx,sy,sw,sh,0,0,sw,sh);encoder.addFrame(frameCanvas,{copy:true,delay:delay,transparent:'rgba(0,0,1,0)',dispose:3});}
encoder.render();},abortCapture:function(){this._progressDisplay.textContent="aborting...";if(this._encoder){this._encoder.abort();document.body.removeChild(this._progressDisplay);delete this._progressDisplay;this._mapMoving=false;this._capturing=false;if(!this._paused){this.animate();}}}});L.dotLayer=function(items,options){return new L.DotLayer(items,options);};function makeColorGradient(frequency1,frequency2,frequency3,phase1,phase2,phase3,center,width,len){let palette=new Array(len);if(center==undefined)center=128;if(width==undefined)width=127;if(len==undefined)len=50;for(let i=0;i<len;++i){let r=Math.round(Math.sin(frequency1*i+phase1)*width+center),g=Math.round(Math.sin(frequency2*i+phase2)*width+center),b=Math.round(Math.sin(frequency3*i+phase3)*width+center);palette[i]=`rgb(${r},${g},${b})`;}
return palette;}
function colorPalette(n){center=128;width=127;steps=10;frequency=2*Math.PI/steps;return makeColorGradient(frequency,frequency,frequency,0,2,4,center,width,n);}