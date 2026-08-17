import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RunTrackerProvider } from "./src/context/RunTrackerContext";
import HomeScreen from "./src/screens/HomeScreen";
import ActiveRunScreen from "./src/screens/ActiveRunScreen";
import RunDetailScreen from "./src/screens/RunDetailScreen";

import ProfileScreen from "./src/screens/ProfileScreen";
import { useEffect } from "react";
import { getUser } from "./src/utils/userStorage";
import { recomputeUserFromRuns } from "./src/utils/recomputeUserFromRuns";

export type RootStackParamList = {
  Home: undefined;
  ActiveRun: { preRunNote?: string; suggestedTargetKm?: number };
  RunDetail: { runId: string };
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    // If the user profile appears empty but runs exist, replay runs to award XP/badges
    (async () => {
      try {
        const user = await getUser();
        if ((user.totalRuns || 0) === 0) {
          await recomputeUserFromRuns();
        }
      } catch (e) {
        console.warn("recomputeUserFromRuns failed:", e);
      }
    })();
  }, []);
  return (
    <SafeAreaProvider>
      <RunTrackerProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: { backgroundColor: "#1a1a2e" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "700" },
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ActiveRun"
              component={ActiveRunScreen}
              options={{ title: "Active Run", headerBackVisible: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: "Profile" }}
            />
            <Stack.Screen
              name="RunDetail"
              component={RunDetailScreen}
              options={{ title: "Run Detail" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </RunTrackerProvider>
    </SafeAreaProvider>
  );
}

