import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RunTrackerProvider } from "./src/context/RunTrackerContext";
import HomeScreen from "./src/screens/HomeScreen";
import ActiveRunScreen from "./src/screens/ActiveRunScreen";
import RunDetailScreen from "./src/screens/RunDetailScreen";

export type RootStackParamList = {
  Home: undefined;
  ActiveRun: undefined;
  RunDetail: { runId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
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

