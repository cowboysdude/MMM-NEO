/* MagicMirror²
 * Module: MMM-NEO
 *
 * By Mykle1, updated for current MagicMirror (uses built-in fetch instead of
 * the "request" package, which MagicMirror no longer includes).
 */
const NodeHelper = require("node_helper");
const Log = require("logger");

module.exports = NodeHelper.create({
	start () {
		Log.log(`Starting node_helper for: ${this.name}`);
	},

	async getNEO (payload) {
		const { identifier, apiKey, date } = payload;
		const key = encodeURIComponent(apiKey || "DEMO_KEY");
		const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${date}&end_date=${date}&api_key=${key}`;
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`NASA answered ${res.status}${res.status === 429 ? " (too many requests: add your own free apiKey)" : ""}`);
			const body = await res.json();
			const objects = (body.near_earth_objects && body.near_earth_objects[date]) || [];
			this.sendSocketNotification("NEO_RESULT", { identifier, date, objects });
		} catch (err) {
			Log.error(`[MMM-NEO] ${err.message}`);
			this.sendSocketNotification("NEO_ERROR", { identifier, message: err.message });
		}
	},

	socketNotificationReceived (notification, payload) {
		if (notification === "GET_NEO") this.getNEO(payload);
	}
});
