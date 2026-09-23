// External Maps contract double only. Application UI and PHP requests remain real.
(() => {
  class Listeners {
    constructor(){this.listeners={};}
    addListener(name,callback){(this.listeners[name]??=[]).push(callback);return {remove:()=>{this.listeners[name]=this.listeners[name].filter(c=>c!==callback);}};}
    emit(name){for(const callback of this.listeners[name]||[]) callback();}
  }
  class LatLng {
    constructor(lat,lng){this.latitude=typeof lat==='object'?(typeof lat.lat==='function'?lat.lat():lat.lat):lat;this.longitude=typeof lat==='object'?(typeof lat.lng==='function'?lat.lng():lat.lng):lng;}
    lat(){return this.latitude;} lng(){return this.longitude;}
    equals(other){return this.lat()===other.lat()&&this.lng()===other.lng();}
    toJSON(){return {lat:this.lat(),lng:this.lng()};}
  }
  class LatLngBounds {
    constructor(){this.points=[];}
    extend(point){this.points.push(new LatLng(point));return this;}
    isEmpty(){return !this.points.length;}
    getNorthEast(){return new LatLng(Math.max(...this.points.map(p=>p.lat())),Math.max(...this.points.map(p=>p.lng())));}
    getSouthWest(){return new LatLng(Math.min(...this.points.map(p=>p.lat())),Math.min(...this.points.map(p=>p.lng())));}
  }
  class Map extends Listeners {
    constructor(element,options){super();this.element=element;this.center=new LatLng(options.center);this.zoom=options.zoom;window.__mapsTest.map=this;}
    setCenter(value){this.center=new LatLng(value);} getCenter(){return this.center;}
    setZoom(value){this.zoom=value;this.emit('zoom_changed');} getZoom(){return this.zoom;}
    setMapTypeId(value){this.mapTypeId=value;} panBy(){} fitBounds(bounds){this.setCenter(bounds.getNorthEast());}
    getProjection(){return null;}
  }
  class AdvancedMarkerElement extends Listeners {
    constructor(options){super();Object.assign(this,options);window.__mapsTest.markers.push(this);}
    setMap(value){this.map=value;}
  }
  class PinElement {constructor(){this.element=document.createElement('span');}}
  class InfoWindow {close(){} setContent(){} open(){}}
  class Autocomplete extends Listeners {
    constructor(input){super();this.input=input;window.__mapsTest.autocomplete=this;}
    getPlace(){return this.place;}
  }
  window.__mapsTest={markers:[],selectAddress(address){const a=this.autocomplete;a.place={formatted_address:address,geometry:{location:new LatLng(45.44,-75.71)}};a.emit('place_changed');}};
  window.google={maps:{importLibrary:async name=>name==='maps'?{Map}:{AdvancedMarkerElement,PinElement},LatLng,LatLngBounds,InfoWindow,
    Size:class {},Point:class {},Marker:{MAX_ZINDEX:1000000},places:{Autocomplete},
    event:{addListenerOnce(target,name,fn){const listener=target.addListener(name,()=>{listener.remove();fn();});return listener;}}}};
  window.initMap();
})();
