import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as authHelpers from "../../utils/supabaseAuth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigation();

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await authHelpers.sendPasswordReset(email.trim());
      setMessage(
        "If this email is registered, we've sent password reset instructions.",
      );
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.desc}>
          Enter your account email to receive reset instructions.
        </Text>
        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
            setMessage(null);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
        {message ? <Text style={styles.msgTxt}>{message}</Text> : null}
        <Pressable
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnTxt}>Send reset link</Text>
          )}
        </Pressable>
        <Pressable onPress={() => nav.navigate("SignIn" as never)}>
          <Text style={styles.link}>Back to sign in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20, marginTop: 40 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  desc: { color: "#666", marginBottom: 18 },
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
  errorTxt: { color: "#E84545", marginBottom: 8 },
  msgTxt: { color: "#2e7d32", marginBottom: 8 },
});

