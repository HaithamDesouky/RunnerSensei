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

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import SignInScreen from "./src/screens/Auth/SignInScreen";
import SignUpScreen from "./src/screens/Auth/SignUpScreen";

export type RootStackParamList = {
  Home: undefined;
  ActiveRun: { preRunNote?: string; suggestedTargetKm?: number };
  RunDetail: { runId: string };
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();

function MainStack() {
  return (
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
  );
}

function AuthStackScreens() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  useEffect(() => {
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

  if (loading) return null; // or a splash screen

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStackScreens />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RunTrackerProvider>
          <AppRoutes />
        </RunTrackerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

