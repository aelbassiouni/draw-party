import 'expo';
import { AppRegistry } from 'react-native';
import App from './App';
// The Expo dev wrapper forces wakefulness, masking the T06 wake checks.
AppRegistry.registerComponent('main', () => App);
