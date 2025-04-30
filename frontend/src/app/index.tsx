import StackNavigation from "../navigation/StackNavigation";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StackNavigation/>
    </GestureHandlerRootView>
  );
}