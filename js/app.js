// They are all the places involved in the web app
var places = [
    {title: 'Florence Central Station', wikiname: 'Firenze Santa Maria Novella', location: {lat: 43.776522, lng: 11.247884}},
    {title: 'Museum of Gallileo', wikiname: 'Museo Gallileo', location: {lat: 43.767734, lng: 11.255903}},
    {title: 'Basilica of Saint Lawrence', wikiname: 'San Lorenzo Florence', location: {lat: 43.774962, lng: 11.253876}},
    {title: 'Medici Riccardi Palace', wikiname: 'Palazzo Medici Riccardi', location: {lat: 43.77519, lng: 11.255775}},
    {title: 'Public Square', wikiname: 'Piazza della Signoria', location: {lat: 43.769686, lng: 11.255642}},
    {title: 'Old Bridge', wikiname: 'Ponte Vecchio', location: {lat: 43.767925, lng: 11.253143}},
    {title: 'Uffizi Gallery', wikiname: 'Uffizi', location: {lat: 43.767786, lng: 11.255311}},
    {title: 'Cathedral of Saint Mary', wikiname: 'Florence Cathedral', location: {lat: 43.773145, lng: 11.25596}},
    {title: 'Pitti Palace', wikiname: 'Palazzo Pitti', location: {lat: 43.765153, lng: 11.250008}},
    {title: 'Michelangelo Square', wikiname: 'Piazzale Michelangelo', location: {lat: 43.762931, lng: 11.265056}},
    {title: 'Boboli Gardens', wikiname: 'Boboli Gardens', location: {lat: 43.762497, lng: 11.2484}},
    {title: 'Gallery of the Academy', wikiname: "Galleria dell'Accademia",location: {lat: 43.77681, lng: 11.259087}},
    {title: 'Old Palace', wikiname: "Palazzo Vecchio",location: {lat: 43.769301, lng: 11.256151}},
    {title: 'Basilica of Santa Maria', wikiname: "Santa Maria Novella", location: {lat: 43.774635, lng: 11.249386}},
];

// Place constructor
var Place = function(data){
    var self = this;

    // official English Name for this place
    self.title = ko.observable(data.title);

    // coresponding place name on Wikipedia, sometimes this is Italian
    self.wikiname = ko.observable(data.wikiname);

    // position information of this place
    self.lat = ko.observable(data.location.lat);
    self.lng = ko.observable(data.location.lng);

    // introduction of this place from Wikipedia
    // this value will be assigned later via Wikipedia API
    self.wikiInfo = ko.observable("");

    // link address for this place on Wikipedia
    // this value will be assigned later via Wikipedia API
    self.wikiAddress = ko.observable("");

    // url of a photo for this place from Flicker
    // this value will be assigned later via Flicker API
    self.photoUrl = ko.observable("");

    // showDropDown value decide whether the dropDown menu of this place in the list should show
    self.showDropDown = ko.observable(false);

    // bounce the marker, when we mouseover the corresponding place in the list
    self.startBounce = function(){
        self.marker.setAnimation(google.maps.Animation.BOUNCE);
    };

    // stop bouncing the marker, when we mouseout the corresponding place in the list
    self.endBounce = function(){
        self.marker.setAnimation(null);
    };

    // toggle the drop down menu for this place
    // moreover, the corresponding marker's color will change
    self.toggleDropDown = function(){
        if (self.showDropDown()){
            self.showDropDown(false);
            self.marker.setIcon("http://maps.google.com/mapfiles/ms/icons/blue-dot.png");
            self.largeInfowindow.close();
        }
        else{
            self.showDropDown(true);
            self.marker.setIcon("http://maps.google.com/mapfiles/ms/icons/red-dot.png");
            retrieveStreetView(self);
            self.largeInfowindow.open(map, self.marker);
        }
    };
};

// ViewModel constructor
var ViewModel = function(){
    var self = this;

    // deifine place list.
    self.placeList = ko.observableArray([]);

    // insert each place into the place list.
    places.forEach(function(placeItem){
        self.placeList.push(new Place(placeItem));
    });

    // define the filter as an observable and bind it with textInput in the HTML.
    self.filter = ko.observable("");

    // this function reset the filter to empty.
    self.resetFilter = function(){
        self.filter("");
    };

    // this value tracks if there is problem in fetching data from wikipedia
    // if this value becomes true, web page will inform user that error happens
    self.wikiError = ko.observable(false);

    // this value tracks if there is problem in fetching data from flicker
    // if this value becomes true, web page will inform user that error happens
    self.flickerError = ko.observable(false);
};

// initiate myViewModel, it will be later applied bindings
var myViewModel = new ViewModel();
console.log("Construct myViewModel --> Done!");


// the myViewModel.filteredPlaces is a computed observable
// it is actually a subset of myViewModel.placeList, depending on the current filter
// Corresponding markers will show/hide depending on the filteredPlaces
myViewModel.filteredPlaces = ko.computed(function(){

    var self = myViewModel;

    // whenever filter changes, first make all the markser visible again
    ko.utils.arrayForEach(self.placeList(), function(place){
        // When we load the page for the first time,
        // initMap function (async) will run after myViewModel is created,
        // at that point, each place doesn't have a marker property yet,
        // because each place is assigned a marker in initMap function.

        // This check is used to avoid the error when we load the page first time.
        if (place.hasOwnProperty("marker")){
            place.marker.setVisible(true);
        }

        // Also make sure all the infowindow is closed
        if (place.hasOwnProperty("largeInfowindow")){
            place.largeInfowindow.close();
        }
    });

    // now use the filter to both filter the list and hide/show markers
    var filter = self.filter().toLowerCase();
    if(!filter){
        // no need to hide any markers
        return self.placeList();
    }
    else {
        return ko.utils.arrayFilter(self.placeList(), function(place){
            if (place.title().toLowerCase().includes(filter)){
                // if a place is chosen to fliteredPlaces, nothing needs to be done
                return true;
            }
            else{
                // if a place is not chosen to filteredPlaces, we hide its marker
                place.marker.setVisible(false);
                return false;
            }
        });
    }

});
console.log("Create filteredPlaces --> Done!");


// Now let's fetch data from wikipedia for each place
ko.utils.arrayForEach(myViewModel.placeList(), function(place){
    var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&search='+
        place.wikiname() + '&format=json&callback=wikiCallback';
    $.ajax({
        url: wikiUrl,
        dataType: "jsonp"
    }).done(function(response){
        if(response){
            place.wikiInfo(response[2][0]);
            place.wikiAddress(response[3][0]);
        }
        else{
            place.wikiInfo("No info available ...");
            myViewModel.wikiError(true);
        }
    }).fail(function(){
        // if we have problem connecting to wikipedia, set wikiError to be true
        myViewModel.wikiError(true);
    });
});
console.log("Fetch place intro from Wikipedia --> Done!");


// Now let's fetch data from flicker
ko.utils.arrayForEach(myViewModel.placeList(), function(place){
    var flickerUrl = 'https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=af9e0d2a6bae07769818f12114172033&text=' +
    place.wikiname() + '&per_page=1&format=json&jsoncallback=?';
    $.ajax({
        url: flickerUrl,
        dataType: "json"
    }).done(function(response){
        if (response && response.stat == 'ok') {
            // if nothing wrong, first get the photo information from response
            var photoInfo = response.photos.photo[0];
            // then use the photo information to get the photo url and store it to the place
            var finalPhotoUrl = "https://farm" + photoInfo.farm + ".staticflickr.com/" +
                photoInfo.server + "/" + photoInfo.id + "_" + photoInfo.secret +".jpg";
            place.photoUrl(finalPhotoUrl);
        }
        else{
            place.photoUrl("");
            myViewModel.flickerError(true);
        }

    }).fail(function(){
        // if we have problem connecting flicker, set flickerError to be true
        myViewModel.flickerError(true);
    });
});
console.log("Fetch place photo from Flicker --> Done!");


// Map is initiated asynchronouslly
var map;
var markers = [];
function initMap(){

    map = new google.maps.Map(document.getElementById("map"), {
          center: {lat: 43.76956, lng: 11.255814},
          zoom: 13
        });

    var bounds = new google.maps.LatLngBounds();

    // We use the location of each place to create a corresponding marker
    // And we store the marker as a object property in that place
    for (var i = 0; i < myViewModel.placeList().length; i++) {
        // at this point, the place points to myViewModel.placeList()[i]
        var place = myViewModel.placeList()[i];

        var position = {lat: place.lat(), lng: place.lng()};
        var title = place.title();

        // Create a marker per location, and put into markers array.
        var marker = new google.maps.Marker({
            map: map,
            position: position,
            title: title,
            animation: google.maps.Animation.DROP,
            id: i,
            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        });

        // Store the corresponding marker within myViewModel.placeList()[i]
        place.marker = marker;

        // Each place also has an associated inforwindow, which contains streeview of the the place
        place.largeInfowindow = new google.maps.InfoWindow({
            content: "",
            id: i
        });

        // Make sure if you close the largeinfowindow,
        // you also hide the dropdown menu in the list and reset the marker to blue
        place.largeInfowindow.addListener("closeclick", function(){
            var place = myViewModel.placeList()[this.id];
            place.marker.setIcon("http://maps.google.com/mapfiles/ms/icons/blue-dot.png");
            place.showDropDown(false);
        });

        // extend the boundaries to the map for each marker
        bounds.extend(marker.position);

        // create an onlick event to open an infowindow on each marker
        // moreover, when you click a marker it color will change,
        // and place in the list will show/hide drop down menu accordingly
        marker.addListener('click', function(){

            var self = this;

            // use the marker id to get its corresponding place
            var place = myViewModel.placeList()[self.id];

            // if marker is blue, then change its color to red and show dropdown menu
            if (self.getIcon() == "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"){
                self.setIcon("http://maps.google.com/mapfiles/ms/icons/red-dot.png");
                place.showDropDown(true);
                retrieveStreetView(place);
                // now let's open infowindow finally
                place.largeInfowindow.open(map, self);
            }

            // if marker is red, then change its color to blue and hide dropdown menu
            else {
                self.setIcon("http://maps.google.com/mapfiles/ms/icons/blue-dot.png");
                place.showDropDown(false);
                place.largeInfowindow.close();
            }
        });
    }

    map.fitBounds(bounds);

    google.maps.event.addDomListener(window, 'resize', function() {
        map.fitBounds(bounds);
    });

    console.log("Initialize Map --> Done!");
};

// This function is called when user clicks a place in the list, or click a marker in the map
function retrieveStreetView(place){

    var self = place.marker;
    var streetViewService = new google.maps.StreetViewService();
    var radius = 10;

    function getStreetView(data, status) {
        if (status == google.maps.StreetViewStatus.OK) {
            // if we can get street view, add it to the infowindow content of the place
            var nearStreetViewLocation = data.location.latLng;
            var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, self.position);
            place.largeInfowindow.setContent('<div>' + self.title + '</div><div class="pano" id="pano' + '-' + self.id + '"></div>');
            var panoramaOptions = {
                position: nearStreetViewLocation,
                pov: {
                    heading: heading,
                    pitch: 30
                    }
                };
            var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'+'-'+ self.id), panoramaOptions);
        }
        else{
            // if we cannot get stree view, instead show error message in the infowindow
            place.largeInfowindow.setContent('<div>' + self.title + '</div>' + '<div>No Street View Found</div>');
        }
    }

    // Use streetview service to get the closest streetview image within
    // 50 meters of the markers position
    streetViewService.getPanoramaByLocation(self.position, radius, getStreetView);
}

// this function will only trigger when app cannot connect to google map api
function mapAPIError(){
    alert("Sorry, we fail to connect Google Map API...Please try again later...");
}

// Finally, everything is ok, let's bind myViewModel and play with app!
ko.applyBindings(myViewModel);