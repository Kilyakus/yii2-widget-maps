/**
 * Google Map manager - renders map and put markers
 * Address priority - House Number, Street Direction, Street Name, Street Suffix, City, State, Zip, Country
 */
var gm = $('.gm-widget');
var options = [];
function googleMaps(object,options){
	var dots = 0;
	var uploadingTextInterval;
	var pub = {
		id: null,
		nextAddress: 0,
		zeroResult: 0,
		delay: 10, // 300
		bounds: [],
		geocoder: [],
		markerClusterer: false,
		clusterClick: false,
		markers: [],
		infoWindow: [],
		infoWindowOptions: [],
		containerId: 'map_canvas',
		geocodeData: [],
		mapOptions: {
			zoom: (getcookie('_gmZ') ? getcookie('_gmZ') : 4),
			center: getcookie('_gmP') ? JSON.parse(getcookie('_gmP')) : null //new google.maps.LatLng(53.666464, -2.686693)
		},
		listeners: [],
		renderEmptyMap: true,
		map: null,
		geocode: false,
		connection: true,
		dataNearby: [],
		minDirection: [],
		// parent: '.field-item-locality_id',
		parent: null,
		init: function () {
		},
		initModule: function (options) {
			initOptions(options).done(function () {
				google.maps.event.addDomListener(window, 'load', initializeMap());
			});
		},
		getAddress: function (location, htmlContent, loadMap) {
			var search = location.address;
			if(location.latitude && location.longitude){
				search = location.latitude + ',' + location.longitude;
				var place = {'geometry': {'location': new google.maps.LatLng(location.latitude,location.longitude)}};
				pub.drawMarker(place, htmlContent, location);
				pub.delay = 10; // 300
				loadMap();
			} else{
			//	 pub.geocoder.geocode({'address': search}, function (results, status) {
			//		 if (status == google.maps.GeocoderStatus.OK) {
			//			 var place = results[0];
			//			  console.log(place.geometry.location.lat());
			//			 if(!htmlContent){
			//				 var position = explode(', ',pub.titleMarker(place));
			//				 htmlContent = '<h4 class="m-0 mb-10">'+position[0]+'</h4>';
			//			 }
			//			 pub.drawMarker(place, htmlContent, location);
			//			 pub.delay = 10; // 300
			//		 }
			//		 else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
			//			 pub.nextAddress--;
			//			 pub.delay = 2000;
			//		 }
			//		 else if (status == google.maps.GeocoderStatus.ZERO_RESULTS) {
			//			 if (location.address != location.country) {
			//				 pub.nextAddress--;
			//				 pub.geocodeData[pub.nextAddress].address = pub.geocodeData[pub.nextAddress].country;
			//			 } else {
			//				 // if(!htmlContent){
			//				 //	 var position = explode(', ',pub.titleMarker(place));
			//				 //	 htmlContent = '<h4 class="m-0 mb-10">'+position[0]+'</h4>';
			//				 // }
			//				 // pub.drawMarker(pub.mapOptions.center, htmlContent, location.icon, location.type, location.title);
			//			 }
			//		 }
			//		 loadMap();
			//	 });
			}
		},
		updatePosition: function (position) {
			var coordinates = [position];
			if (!pub.isPositionUnique(position)) {
				var latitude = position.lat();
				var lngModify = (Math.abs(Math.cos(latitude)) / 111111) * -5;
				var iteration = 0;
				while (true) {
					iteration++;
					var newLng = position.lng() + (lngModify * iteration);
					position = new google.maps.LatLng(latitude + 0.00001, newLng);
					if (pub.isPositionUnique(position)) {
						break;
					}
					lngModify *= -1;
				}
			}

			coordinates.push(position);

			var path = new google.maps.Polyline({
				path: coordinates,
				geodesic: true,
				strokeColor: '#00AAFF',
				strokeOpacity: 1.0,
				strokeWeight: 0.4
			});
			path.setMap(pub.map);

			return position;
		},
		isPositionUnique: function (position) {
			if (pub.markers.length != 0) {
				for (var i = 0; i < pub.markers.length; i++) {
					var existingMarker = pub.markers[i];
					var pos = existingMarker.getPosition();
					//if a marker already exists in the same position as this marker
					if (position.equals(pos)) {
						return false;
					}
				}
			}

			return true;
		},
		titleMarker: function(place) {
			var title;
			locality = place.address_components
			if(locality){
				for (var i = 0; i < locality.length; i++) {
					if(in_array(locality[i].types,'locality')){
						title = locality[i].long_name;
						break;
					}
				}
				if(!title){
					title = place.formatted_address;
				}
			}else{
				// console.log(place)
			}
			return title;
		},
		drawMarker: function (place, htmlContent, location = null) {
			var position = pub.updatePosition(place.geometry ? place.geometry.location : place);

			pub.bounds.extend(position);

			var marker = new google.maps.Marker({
				title: location.title ? location.title : pub.titleMarker(place),
				type: location.type,
				latitude: location.latitude,
				longitude: location.longitude,
				map: pub.map,
				position: position,
				icon: location.icon,
				htmlContent: location.htmlContent,
				// draggable: (location.type == 'draw') ? true : false,
			});
			// if(location.type == 'draw'){
			//	 pub.marker = marker;
			// }
			bindInfoWindow(marker, pub.map, pub.infoWindow, htmlContent);
			pub.markerClusterer.addMarker(marker);
			pub.markers.push(marker);
			if (pub.nextAddress == pub.geocodeData.length) {
				if (pub.userOptions.mapOptions.center) {
					pub.map.setCenter(pub.mapOptions.center);
				} else {
					google.maps.event.addListenerOnce(pub.map, 'bounds_changed', function () {
						if (pub.map.getZoom() > 17) {
							pub.map.setZoom(17);
						}
					});
					pub.map.fitBounds(pub.bounds);
				}
			}
		},
		initGeocode: function (e,directionsService,directionsDisplay,place) {

			var markers = pub.markers;
			for (var i = 0; i < markers.length; i++) {
				if(in_array(['draw','locality'],markers[i].type)){
					markers[i].setMap(null);
					markers.splice(i);
				}
			}

			var markers = pub.markerClusterer.markers_;

			for (var i = 0; i < markers.length; i++) {
				if(in_array(['draw','locality'],markers[i].type)){
					markers[i].setMap(null);
					markers.splice(i);
				}
				pub.markerClusterer.clearMarkers();
			}
			pub.markerClusterer.addMarkers(markers);

			var position = getPos(e);

			var location = {
				title: 'Новый маркер',
				type: 'draw',
				icon: getIco('form'),
			};

			pub.drawMarker(position, null, location);
			pub.map.setCenter(position);
			// pub.map.setZoom(12,{smooth:true, position:position,centering:true});

			var id = pub.id ? pub.id : '';
			if(getObj('item-latitude'+id)){
				getObj('item-latitude'+id).value = position.lat();
				getObj('item-longitude'+id).value = position.lng();
			}

			if(place){
				place = '&address=' + place;
			}else if(e){
				place = '&latlng=' + getPos(e).lat() + ',' + getPos(e).lng();
			}

			var coordinates = {data:encodeURI(place),latitude:getPos(e).lat(),longitude:getPos(e).lng(),isAjax:true};

			pub.responseWaiting('Определяем город');

			ajax('create-maps',(coordinates),true).done(function(data){

				var geometry = data['geometry'];

				if(data['locality']){

					pub.responseWaiting('Сохраняем полученные данные');

					pub.genRequest(e,data,directionsService,directionsDisplay,false,geometry);

				}else{

					pub.responseWaiting('Ничего не найдено, определяем близжайший город');

					var place = pub.genAddress(data,e);

					ajax('get-nearby',(coordinates),true).done(function(data){
						if(data){
							pub.nearbyCities(data,directionsService,directionsDisplay,e,place,null);
						}else{
							pub.responseError(address);
						}
					});

				}
			});
			
			return { lat: getPos(e).lat(), lng: getPos(e).lng() }
		},
		genRequest: function (e,data,directionsService,directionsDisplay,stop,geometry){
			if(data){
				var address = pub.genAddress(data,e);
				if(data['locality']){
					if(stop != true){
						var coordinates = getPos(null,data['locality']['latitude'],data['locality']['longitude']);

						var location = {
							title: data['locality']['name_ru'],
							type: 'locality',
							icon: getIco('attach'),
						};

						pub.drawMarker(coordinates, data['locality']['name_ru'], location);

						pub.map.setCenter(coordinates);
					}
					pub.getLocality(directionsService,directionsDisplay,data,data['locality']['latitude'],data['locality']['longitude'],e);

					pub.responseSuccess();
				}else{
					if(geometry){
						pub.responseError(address,geometry);
					}else{
						pub.responseError(address);
					}
				}
			}else{
				pub.responseError();
			}

			return data;
		},
		genAddress: function (data,e){
			var address = '';
			if(data['country']){
				address += data['country']['name_ru'];
			}
			if(data['region']){
				address += ', '+data['region']['name_ru'];
			}else if(!data['region'] && data['locality']){
				address += ', '+data['locality']['name_ru'];
			}
			if(data['locality']){
				if(data['region']){
					if(data['locality']['name_ru'] != data['region']['name_ru']){
						address += ', '+data['locality']['name_ru'];
					}
				}
			}
			if(data['route']){
				address += ', '+data['route']['name_ru'];
			}
			if(data['street_number']){
				address += ', '+data['street_number']['name_ru'];
			}

			return address;
		},
		getLocality: function (directionsService,directionsDisplay,data,latitude,longitude,e){
			if(data['locality']){
				directionsDisplay.setMap(pub.map);
				directionsDisplay.setOptions( { suppressMarkers: true, suppressInfoWindows: true, polylineOptions: {strokeColor: 'red'} } );
				pub.getRequest(directionsService,directionsDisplay,data['locality']['latitude'],data['locality']['longitude'],latitude,longitude,google.maps.DirectionsTravelMode.DRIVING,data);
			}
		},
		getRequest: function (directionsService,directionsDisplay,o_latitude,o_longitude,d_latitude,d_longitude,travelMode,data){

			var mass = [],massNames = [];

			for (var key in data) {

				if(data[key] && key != 'geometry'){

					var json = data[key].data,
						object = (typeof json === 'string') ? JSON.parse(json) : [];

					var name = object.ru ? object.ru : (object.en ? object.en : data[key].source);

					push(massNames,name);
					
					var keys = { key: key, data: data[key] };
					push(mass,keys);
				}
			}

			for (var i = 0; i < mass.length; i++) {

				var json = mass[i].data.data,
					object = (typeof json === 'string') ? JSON.parse(json) : [];

				var name = object.ru ? object.ru : (object.en ? object.en : mass[i].data.source);

				pub.geoSelect(data,mass[i].key,name);

			}

			var request = {
				origin: getPos(null,o_latitude,o_longitude), //точка старта
				destination: getPos(null,d_latitude,d_longitude), //точка финиша
				waypoints:[
					// {
					//  location: LatLng,
					//  stopover:false
					// },{
					//  location: LatLng,
					//  stopover:true
					// }
				],
				optimizeWaypoints: true,
				avoidHighways: true,
				avoidTolls: true,
				// provideRouteAlternatives: true,
				provideRouteAlternatives: false,
				travelMode: google.maps.DirectionsTravelMode.WALKING, //режим прокладки маршрута
				unitSystem: google.maps.DirectionsUnitSystem.METRIC
			};
			pub.directionService(directionsService,directionsDisplay,request);
		},
		nearbyCities: function (data,directionsService,directionsDisplay,e,place,geometry){
			if(data && data[0]){

				for (var i=0;i<data.length;i++) {
					var position = getPos(null,data[i]['latitude'],data[i]['longitude']),title = data[i]['name_ru'];
					var htmlContent = '<h4 class="m-0 mb-10">'+title+'</h4>';
					var location = {
						title: title,
						type: 'locality',
						icon: getIco('transparent'),
					};
					pub.drawMarker(position, htmlContent, location);
				}
			
				for (var i = 0; i < data.length; i++) {

					distance = (google.maps.geometry.spherical.computeDistanceBetween(getPos(e), getPos(null,data[i]['latitude'],data[i]['longitude'])) / 1000).toFixed(2);

					var json = {distance: distance, data: data[i]};

					push(pub.dataNearby,json);
				}

				for (var i = 0; i < pub.dataNearby.length; i++) {

					pub.minDirection.push(pub.dataNearby[i]['distance']);
				}	   

				for (var i = 0; i < pub.dataNearby.length; i++) {
					
					if(pub.dataNearby[i]['distance'] == Math.min.apply(Math, pub.minDirection)){

						var data = pub.dataNearby[i]['data'];
						var lat = data['latitude'];
						var lng = data['longitude'];

						if(data['name_ru']){

							for (var i = 0; i < pub.markers.length; i++) {
								if(pub.markers[i]['title'] == data['name_ru']){
									pub.markers[i].setIcon(getIco('attach'));
								}
							}

							var markers = pub.markerClusterer.markers_;

							for (var i = 0; i < markers.length; i++) {
								if(markers[i]['title'] == data['name_ru']){
									markers[i].setIcon(getIco('attach'));
									pub.map.setCenter(markers[i].position);
								}
							}

							var merge = [];
							merge[data['type']] = data;

							pub.geoSelect(merge,data['type'],data['name_ru']);

							pub.responseSuccess();

						}else{

							pub.responseError(place,null);

						}
					}
				}

				pub.dataNearby = [];
				pub.minDirection = [];

			}else{

				pub.responseError(place,geometry);

			}
		},
		directionService: function (directionsService,directionsDisplay,request){
			directionsService.route(request, function(response, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					// directionsDisplay.setDirections(response);
					var route = response.routes[0];
					var summaryPanel = [];

					for (var i = 0; i < route.legs.length; i++) {
						var routeSegment = i + 1;
						summaryPanel += "<b>Route Segment: " + routeSegment + "</b><br />";
						summaryPanel += route.legs[i].start_address + " to ";
						summaryPanel += route.legs[i].end_address + "<br />";
						summaryPanel += route.legs[i].distance.text + "<br /><br />";
					}
					// alert(summaryPanel);
					pub.computeTotalDistance(response);
					
				}
			});
		},
		computeTotalDistance: function (result) {
			var totalDist = 0;
			var totalTime = 0;
			var myroute = result.routes[0];
			for (i = 0; i < myroute.legs.length; i++) {
				totalDist += myroute.legs[i].distance.value;
				totalTime += myroute.legs[i].duration.value;
			}
			totalDist = totalDist / 1000.
			// console.log("total distance is: " + totalDist + " km\ntotal time is: " + (totalTime / 60).toFixed(2) + " minutes");
		},
		responseSuccess: function (){
			var parent = $(pub.parent);
			parent.removeClass('has-error');
			parent.removeClass('has-warning');
			parent.addClass('has-success');
			if(parent.find('.alert-warning').get(0)){
				$(parent.find('.alert-warning').get(0)).remove();
			}
			if(parent.find('.alert-danger').get(0)){
				$(parent.find('.alert-danger').get(0)).remove();
			}
			clearInterval(uploadingTextInterval);
			pub.connection = true;
		},
		responseError: function (place,geometry){
			if(geometry){
				var c = getPos(null,geometry['lat'],geometry['lng']);
				pub.map.setCenter(gP);
				pub.map.setZoom(6,{smooth:true, position:gP,centering:true});
			}
			// if(place){
			//	 $t.val(place);
			// }else{
			//	 $t.val(null);
			// }
			var parent = $(pub.parent);
			
			parent.removeClass('has-success');
			parent.removeClass('has-warning');
			parent.addClass('has-error');
			if(parent.find('.alert-warning').get(0)){
				$(parent.find('.alert-warning').get(0)).remove();
			}
			if(!parent.find('.alert-danger').get(0)){
				parent.append('<div class="alert alert-danger mt-15 mb-0">Ничего не найдено, пожалуйста уточните свой запрос.<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button></div>')
			}
			clearInterval(uploadingTextInterval);
			pub.connection = true; 
		},
		responseWaiting: function (message){
			var parent = $(pub.parent);
			parent.removeClass('has-success');
			parent.removeClass('has-error');
			parent.addClass('has-warning');
			if(parent.find('.alert-warning').get(0)){
				$(parent.find('.alert-warning').get(0)).remove();
			}
			if(parent.find('.alert-danger').get(0)){
				$(parent.find('.alert-danger').get(0)).remove();
			}
			parent.append('<div class="alert alert-warning mt-15 mb-0"><img src="'+pub.baseUrl+'/img/preloader.gif"> ' + message + '<i></i><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button></div>');
			uploadingTextInterval = setInterval(pub.dotsAnimation, 300);
		},
		dotsAnimation: function () {
			var uploadingText = $('.alert.alert-warning');
			dots = ++dots % 4;
			$('i', uploadingText).html(Array(dots+1).join("."));
		},   
		geoSelect: function (data,id,value){
			for (var key in data) {
				if(key == id){
					if(data[key] && data[key].id != null){
						var counter = pub.id ? pub.id : '';
						if($('#item-'+id+'_id'+counter).text().indexOf(value) == -1){
							$('#item-'+id+'_id'+counter).append(new Option(value, data[key].id)).trigger('change');
						}

						if(data[key].id != $('#item-'+id+'_id').val()){
							$('#item-'+id+'_id'+counter).val(data[key].id).trigger("change");
						}
					}
				}
			}
		}
	};

	function initOptions(options) {
		var deferred = $.Deferred();
		pub.bounds = new google.maps.LatLngBounds();
		pub.geocoder = new google.maps.Geocoder();
		pub.infoWindow = new google.maps.InfoWindow(pub.infoWindowOptions);
		pub.map = null;
		pub.markerClusterer = null;
		pub.geocodeData = [];
		pub.nextAddress = 0;
		pub.zeroResult = 0;
		pub.markers = [];
		pub.userOptions = options;
		$.extend(true, pub, options);
		deferred.resolve();

		return deferred;
	}

	function registerListeners() {
		for (listener in pub.listeners) {
			if (pub.listeners.hasOwnProperty(listener)) {
				var object = pub.listeners[listener].object;
				var event = pub.listeners[listener].event;
				var handler = pub.listeners[listener].handler;
				google.maps.event.addListener(pub[object], event, handler);
			}
		}
	}

	function bindInfoWindow(marker, map, infoWindow, html) {
		google.maps.event.addListener(marker, 'click', function () {
			infoWindow.setContent(html);
			infoWindow.open(map, marker);
			ActionsInfoWindow(marker);
		});
	}

	function ActionsInfoWindow(marker){
		$('.gm-save').on('click',function(e){
			ajax('get-places',({id:$(this).attr('data-item'),assign:$(this).attr('data-assign'),action:window.location.pathname}),true).done(function(data){

				pub.infoWindow.close(pub.map, pub.marker);

				if(data['places'][0]){

					if($('#genOtherMarkers').hasClass('hidden')){
						$('#genOtherMarkers').removeClass('hidden');
					}
					$('[data-latitude="'+marker.latitude+'"]').remove();
					$($('#genOtherMarkers').find('tbody')).append('<tr data-id="'+data['places'][0]['id']+'"><td><div class="row"><div class="col-sm-4 col-xs-4 hidden-lg hidden-md"><strong>Места поблизости</strong></div><div class="col-lg-12 col-md-12 col-sm-8 col-xs-8"><h5>'+data['items'][0]['title']+':</h5> '+''+'</div></div></td><td class="text-right"><div class="btn-group btn-group-sm" role="group"><a href="/maps/delete-street/'+data['places'][0]['id']+'" class="btn btn-default confirm-delete" title="Удалить запись"><span class="glyphicon glyphicon-remove"></span></a></div></td></tr>');
				}
			})
		})
	}

	function initializeMap() {
		var container = document.getElementById(pub.containerId);
		container.style.width = '100%';
		container.style.height = '100%';
		pub.map = new google.maps.Map(container, pub.mapOptions);
		setTimeout(function () {
			pub.markerClusterer = new MarkerClusterer(pub.map, [], {gridSize: 50, maxZoom: 17});
			google.maps.event.addListener(pub.markerClusterer, 'clusterclick', function(cluster){
				pub.clusterClick = true;
			});
			registerListeners();
			loadMap();
		}, 100);

		pub.map.addListener('center_changed', function()
		{
			var current_position = pub.map.center;
			pub.mapOptions.center = new google.maps.LatLng(current_position.lat(), current_position.lng());

			var cookie = JSON.stringify(pub.mapOptions.center);
			setcookie('_gmP',cookie);
		});

		pub.map.addListener('zoom_changed', function()
		{
			var current_zoom = pub.map.getZoom();
			pub.mapOptions.zoom = current_zoom;

			var cookie = JSON.stringify(current_zoom);
			setcookie('_gmZ',cookie);
		});

		google.maps.event.addListener(pub.map, 'click', function(e) {
			pub.infoWindow.close();
			if(pub.clusterClick == false){
				if(pub.connection && pub.geocode == true){
					pub.connection = false;

					var directionsService = new google.maps.DirectionsService;

					var directionsDisplay = new google.maps.DirectionsRenderer;

					pub.initGeocode(e,directionsService,directionsDisplay,null);
				}
			}else{
				pub.clusterClick = false;
			}
		});

		google.maps.event.addListener(pub.map, 'zoom_changed', function () {
			if (pub.map.getZoom() < 2) {
				pub.map.setZoom(2);
			}
		});

		var field = $($(pub.parent).children('select,input'));
		field.on('change',function(e){
			if(pub.connection){
				var markers = pub.markerClusterer.markers_;

				for (var i = 0; i < markers.length; i++) {
					if(in_array(['draw','locality'],markers[i].type)){
						markers[i].setMap(null);
						markers.splice(i);
					}
					pub.markerClusterer.clearMarkers();
				}
				pub.markerClusterer.addMarkers(markers);

				var address = $('#' + field.get(0).id + ' option:selected').text();
				var location = {
					icon: getIco('transparent'),
					address: address,
					type: 'locality',
					title: address,
				};

				// pub.getAddress(location, null, loadMap);

				pub.geocoder.geocode({'address': location.address}, function (results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						var place = results[0];
						pub.mapOptions.center = new google.maps.LatLng(place.geometry.location.lat(), place.geometry.location.lng())
						htmlContent = '<p>'+place.formatted_address+'</p>';
						var location = {
							title: place.formatted_address,
							address: address,
							type: 'locality',
							icon: getIco('transparent'),
						};
						pub.drawMarker(place, htmlContent, location);
						pub.delay = 10; // 300
					}
					else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
						pub.nextAddress--;
						pub.delay = 2000;
					}
					else if (status == google.maps.GeocoderStatus.ZERO_RESULTS) {
						//If first query return zero results, then set address the value of the country
						if (location.address != location.country) {
							pub.nextAddress--;
							pub.geocodeData[pub.nextAddress].address = pub.geocodeData[pub.nextAddress].country;
						} else {
							var position = explode(', ',pub.titleMarker(place));
							htmlContent = '<h4 class="m-0 mb-10">'+position[0]+'</h4>';
							pub.mapOptions.center = new google.maps.LatLng(pub.mapOptions.center.lat(), pub.mapOptions.center.lng());
							var location = {
								title: pub.titleMarker(place),
								type: 'locality',
								icon: getIco('transparent'),
							};
							pub.drawMarker(pub.mapOptions.center, htmlContent, location);
						}
					}
					loadMap();
				});
			}
		})
	}

	function loadMap() {
		setTimeout(function () {
			if (pub.nextAddress < pub.geocodeData.length) {
				var location = {
					title: pub.geocodeData[pub.nextAddress].title ? pub.geocodeData[pub.nextAddress].title.replace(/\+/g, ' ') : null,
					icon: pub.geocodeData[pub.nextAddress].icon,
					country: pub.geocodeData[pub.nextAddress].country,
					city: pub.geocodeData[pub.nextAddress].city,
					address: pub.geocodeData[pub.nextAddress].address,
					latitude: pub.geocodeData[pub.nextAddress].latitude,
					longitude: pub.geocodeData[pub.nextAddress].longitude,
					htmlContent: pub.geocodeData[pub.nextAddress].htmlContent.replace(/\+/g, ' '),
				};
				var htmlContent = pub.geocodeData[pub.nextAddress].htmlContent;
				var htmlContent = htmlContent.replace(/\+/g, ' ');
				pub.getAddress(location, htmlContent, loadMap);
				pub.nextAddress++;
			}
		}, pub.delay);
	}

	$('[data-latitude]').on('click',function(){
		var lat = $(this).attr('data-latitude');
		var lng = $(this).attr('data-longitude');
		var position = getPos(null,lat,lng);
		pub.map.setCenter(position);
		pub.map.setZoom(13,{smooth:true, position:position,centering:true});
		var markers = pub.markers;
		for (var i = 0; i < markers.length; i++) {
			if(markers[i].latitude == lat && markers[i].longitude == lng){
				pub.marker = markers[i];
				google.maps.event.addListenerOnce(pub.map, 'idle', function(){
					ActionsInfoWindow(pub.marker);
				});
				pub.infoWindow.setContent(markers[i].htmlContent);
				pub.infoWindow.open(pub.map, markers[i]);
			}
		}
	})

	function getPos(e,lat,lng){
		if(e){
			if(e.latLng){
				var direction=[];direction['lat']=e.latLng.lat();direction['lng']=e.latLng.lng();return new google.maps.LatLng(direction['lat'],direction['lng']);
			}
		}else{return new google.maps.LatLng(lat,lng);}
	}

	function getObj(id){return document.getElementById(id);}

	function selObj(id){return getObj(id).options[getObj(id).selectedIndex].text;}

	function getUrl(url){return pub.getUrl + url;}

	function getIco(src){return '/bin/media/img/spotlight-'+src+'.png';}

	function ajax(url,data,success){
		if(success == true){
			return $.ajax({url:getUrl(url),data:data,success:function(data){return data;},})
		}else{
			return $.ajax({url:getUrl(url),data:data,})
		}
	}

	function in_array(arr,value){let array = arr.find(function(el){return (value == el)});return array;}

	function explode(separator,string) {return string.split(separator);}

	function push(arr,value){if(!check(arr,value)){arr.push(value);}}

	function check(arr,value){let check = arr.find(function(el){return (value == el)});return check;}

	return pub;
}
function setcookie(name,value,path,domain,secure){
	var cookie_string = name + "=" + escape (value);

	var expires = new Date;
	expires.setMinutes(expires.getMinutes() + 1)
	cookie_string += "; expires=" + expires.toGMTString();

	if(path){
		cookie_string += "; path=" + escape (path);
	}else{
		cookie_string += "; path=" + escape ('/');
	}

	if(domain)
		cookie_string += "; domain=" + escape (domain);

	if(secure)
		cookie_string += "; secure";

	document.cookie = cookie_string;
}

function getcookie(cname) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for(var i = 0; i <ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}