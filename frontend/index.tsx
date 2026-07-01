import { registerRootComponent } from 'expo';
import { initializeGlobalAlerts } from './src/components/CustomAlert';

// Initialize global alert interceptor before any screens or components load
initializeGlobalAlerts();

import App from './src/app/index';

registerRootComponent(App);