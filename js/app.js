var App = Ember.Application.create();

App.BrowserStore = {
    storage: function () {
        return window.localStorage;
    },

    saveUser: function (user) {
        function toJson(user) {
            return {
                "name": user.get('name'),
                "league": user.get('league'),
                "email": user.get('email'),
                "id": user.get('id')
            }
        }

        this.storage().setItem('currentUser', JSON.stringify(toJson(user)));
    },

    loadUser: function (emberStore) {
        var jsonUser = JSON.parse(this.storage().getItem('currentUser'));
        if (!jsonUser) {
            return null;
        }
        var user = emberStore.find('user', jsonUser.email);
        return user;
    }
}

App.localStore = App.BrowserStore;

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
    this.route('myleague', {path: "/leagues/mine"})
});

App.LeaguesRoute = Ember.Route.extend({
    beforeModel: function () {
        if (!App.CurrentUser) {
            this.transitionTo('identify');
        }
    },

    model: function () {
        return this.store.find('league')
    }
});

App.IndexRoute = Ember.Route.extend({
    beforeModel: function () {
        if (!App.CurrentUser) {
            this.transitionTo('identify');
        }
    }
});

App.MyleagueRoute = Ember.Route.extend({
    beforeModel: function () {
        if (!App.CurrentUser) {
            this.transitionTo('identify');
        }
        this.transitionTo("league", App.CurrentUser.get('league'))
    }
});

App.IdentifyRoute = Ember.Route.extend({
    beforeModel: function () {
        var controller = this;
        if (App.localStore.loadUser(this.store)) {
            App.CurrentUser = App.localStore.loadUser(this.store);
            App.CurrentUser.then(function () {
                controller.transitionTo('myleague');
            })

        }
    }
});


App.LeagueRoute = Ember.Route.extend({
    beforeModel: function () {
        if (!App.CurrentUser) {
            this.transitionTo('identify');
        }
    },

    model: function (league) {
        return this.store.find('league', league.league_id)
    }
});
App.LeaguesController = Ember.ArrayController.extend({

});

App.LeagueController = Ember.ObjectController.extend({
  actions: {
      challengePlayer: function(playerEmail, playerName, date){
          alert(playerEmail + ' challenged! to play on ' + date);
          document.location.href = "mailto:" +playerEmail+"?subject="+encodeURIComponent("Tennis League Match")+
              "&body="+encodeURIComponent("Hi "+playerName.split(" ")[0]+"\nDo you want to play our league match on " + date +"? .\n\nKind Regards,\n\n"+App.CurrentUser.content._data.name);
      }
  }
});

App.IdentifyController = Ember.ObjectController.extend({
    email: null,
    error: null,
    actions: {
        login: function () {
            var controller = this;
            var email = this.get('email');
            var foundUser = this.store.find('user', email);
            foundUser.then(function () {
                if (foundUser.get('email') == 'none') {
                    controller.set('error', 'User not found, please retry')
                    controller.set('email', null)
                    controller.transitionToRoute('identify');
                } else {
                    controller.set('error', null)
                    App.CurrentUser = foundUser
                    App.localStore.saveUser(foundUser);
                    controller.transitionToRoute('myleague');
                }
            });


        }
    }
});

App.LeagueView = Em.View.extend({
    didInsertElement: function () {
        var view = this
        $(".form_datetime").datetimepicker({
            format: "dd/mm - hh:ii",
            autoclose: true,
            maxView: 2,
            todayHighlight: true,
            minuteStep: 30
        }).on('changeDate', function (ev) {
              var emailChallenged = $(ev.currentTarget.parentNode).children(".ember-text-field.email-to-challenge").val();
              var nameChallenged = $(ev.currentTarget.parentNode).children(".ember-text-field.name-to-challenge").val();
              view.get("controller").send("challengePlayer", emailChallenged, nameChallenged, ev.date);
            });
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


