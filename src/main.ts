import './global.css';
import { Trackers } from './Trackers.ts';
import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		Trackers
	}
});

export default app;
