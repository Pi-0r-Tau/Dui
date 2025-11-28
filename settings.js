/**
 * Settings Management
 * Handles API configuration and storage
 * Updated for static GitHub Pages deployment (uses localStorage)
 */

var Settings = (function () {
  var STORAGE_KEY = 'isbnDeweySettings';
  var cachedSettings = null;

  var defaultSettings = {
    apiKeys: {
      googlebooks: '',
      isbndb: ''
    },
    enabledApis: {
      openlibrary: true,
      googlebooks: true,
      loc: true,
      isbndb: false
    },
    apiPriority: ['openlibrary', 'loc', 'googlebooks', 'isbndb']
  };

  function load() {
    if (cachedSettings) {
      return Promise.resolve(JSON.parse(JSON.stringify(cachedSettings)));
    }

    return new Promise(function (resolve) {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          var data = JSON.parse(saved);
          var merged = {
            apiKeys: Object.assign({}, defaultSettings.apiKeys, data.apiKeys || {}),
            enabledApis: Object.assign({}, defaultSettings.enabledApis, data.enabledApis || {}),
            apiPriority: data.apiPriority || defaultSettings.apiPriority
          };
          cachedSettings = merged;
          resolve(JSON.parse(JSON.stringify(merged)));
        } else {
          cachedSettings = JSON.parse(JSON.stringify(defaultSettings));
          resolve(JSON.parse(JSON.stringify(defaultSettings)));
        }
      } catch (e) {
        APIBase.log.error('Settings', 'Load error', e);
        cachedSettings = JSON.parse(JSON.stringify(defaultSettings));
        resolve(JSON.parse(JSON.stringify(defaultSettings)));
      }
    });
  }

  function save(settings) {
    return new Promise(function (resolve, reject) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        cachedSettings = JSON.parse(JSON.stringify(settings));
        APIBase.log.success('Settings', 'Saved');
        resolve();
      } catch (e) {
        APIBase.log.error('Settings', 'Save error', e);
        reject(e);
      }
    });
  }

  function getApiKey(apiId) {
    return load().then(function (settings) {
      return settings.apiKeys[apiId] || '';
    });
  }

  function setApiKey(apiId, key) {
    return load().then(function (settings) {
      settings.apiKeys[apiId] = key;
      return save(settings);
    });
  }

  function isApiEnabled(apiId) {
    return load().then(function (settings) {
      return settings.enabledApis[apiId] === true;
    });
  }

  function setApiEnabled(apiId, enabled) {
    return load().then(function (settings) {
      settings.enabledApis[apiId] = enabled;
      return save(settings);
    });
  }

  function getEnabledApis() {
    return load().then(function (settings) {
      return settings.apiPriority.filter(function (apiId) {
        return settings.enabledApis[apiId] === true;
      });
    });
  }

  function getDefaults() {
    return JSON.parse(JSON.stringify(defaultSettings));
  }

  return {
    load: load,
    save: save,
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    isApiEnabled: isApiEnabled,
    setApiEnabled: setApiEnabled,
    getEnabledApis: getEnabledApis,
    getDefaults: getDefaults
  };

})();

window.Settings = Settings;