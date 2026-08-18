import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const nav = useNavigation();

  const onSubmit = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // No explicit navigation here — App's auth state will switch stacks
    } catch (e: any) {
      Alert.alert("Sign-in failed", e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to RunnerSensei</Text>
        <Text style={styles.desc}>
          Track your runs, earn XP, and build streaks. Sign in to continue.
        </Text>
        <Text style={styles.title}>Sign In</Text>
        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Password"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Pressable
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={styles.btnTxt}>
            {loading ? "Signing in…" : "Sign In"}
          </Text>
        </Pressable>
        <Pressable onPress={() => nav.navigate("SignUp" as never)}>
          <Text style={styles.link}>Don’t have an account? Sign up</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20, marginTop: 40 },
  welcome: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    color: "#1a1a2e",
  },
  desc: { color: "#666", marginBottom: 18 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#1a1a2e",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  btnTxt: { color: "#fff", fontWeight: "700" },
  link: { color: "#1a1a2e", textAlign: "center", marginTop: 12 },
});

