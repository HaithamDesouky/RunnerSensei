import * as Location from "expo-location";
import { Alert, Platform } from "react-native";

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== "granted") {
    Alert.alert(
      "Location Required",
      `Go to ${Platform.OS === "ios" ? "Settings → RunnerSensei" : "Settings → App Permissions"} → Location and enable it.`,
    );
    return false;
  }
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== "granted") {
    Alert.alert(
      "Background Location",
      'Run will only track while the app is open. Go to Location → "Allow all the time" for background tracking.',
    );
  }
  return true;
}

