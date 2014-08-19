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
    this.resource('leagues', {path: "/leagues"}, function () {
        this.route('league', {path: "/leagues/:league_id"});
    });
});

App.LeaguesRoute = Ember.Route.extend({
    model: function () {
        return this.store.find('league')
    }
});

App.LeaguesController = Ember.ArrayController.extend({

});

App.League = DS.Model.extend({
    name: DS.attr('string'),
    email: DS.attr('string'),
    phone: DS.attr('string')
});
