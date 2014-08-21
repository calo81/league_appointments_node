var App = Ember.Application.create();

App.FileUploadComponent = Ember.FileField.extend({
    url: '',
    filesDidChange: (function () {
        var uploadUrl = this.get('url');
        var files = this.get('files');

        var uploader = Ember.Uploader.create({
            url: uploadUrl
        });

        if (!Ember.isEmpty(files)) {
            uploader.upload(files[0]);
        }
    }).observes('files')
});

App.Router.map(function () {
    this.resource('leagues', {path: "/leagues"});
    this.route('upload', {path: "/upload"});
    this.resource('league', {path: "/leagues/:league_id"});
    this.route('identify', {path: "/identify"})
});

App.LeaguesRoute = Ember.Route.extend({
    model: function () {
        return this.store.find('league')
    }
});


App.LeagueRoute = Ember.Route.extend({
    model: function (league) {
        return this.store.find('league', league.league_id)
    }
});
App.LeaguesController = Ember.ArrayController.extend({

});

App.LeagueController = Ember.ObjectController.extend({

});

App.IdentifyController = Ember.ObjectController.extend({
    email: null,
    actions: {
        login: function () {
            var email = this.get('email');
            App.CurrentUser = this.store.find('user', email);
        }
    }
});

App.Player = DS.Model.extend({
    name: DS.attr('string'),
    email: DS.attr('string'),
    phone: DS.attr('string')
});

App.User = DS.Model.extend({
   email: DS.attr('string'),
   league: DS.attr('string')
});

App.LeagueSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
        players: {embedded: 'always'}
    }
})

App.League = DS.Model.extend({
    name: DS.attr('string'),
    players: DS.hasMany('player')
});


