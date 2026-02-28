const Setting = require('../models/Setting');

let cachedSettings = {
    maintenance_mode: false,
    currency: '$',
    site_name: 'SmartGrocer'
};

let lastFetched = 0;

async function getSettings() {
    // Cache settings for 2 mins to avoid DB spam
    if (Date.now() - lastFetched > 120000) {
        try {
            const dbSettings = await Setting.find();
            if (dbSettings.length > 0) {
                dbSettings.forEach(s => {
                    if (s.key === 'maintenance_mode') {
                        cachedSettings.maintenance_mode = s.value === 'true' || s.value === true;
                    } else {
                        cachedSettings[s.key] = s.value;
                    }
                });
            }
            lastFetched = Date.now();
        } catch (err) {
            console.error('Error fetching settings for cache', err);
        }
    }
    return cachedSettings;
}

// Function to force invalidate cache when admin saves settings
function clearSettingsCache() {
    lastFetched = 0;
}

module.exports = { getSettings, clearSettingsCache, cachedSettings };
