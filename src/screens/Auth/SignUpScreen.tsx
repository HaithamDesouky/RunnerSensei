import React, { useState, useEffect } from "react";
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

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { signUp } = useAuth();
  const nav = useNavigation();

  const onSubmit = async () => {
    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Please make sure both passwords are identical.",
      );
      return;
    }
    setLoading(true);
    try {
      const resp = await signUp(email.trim(), password);
      Alert.alert(
        "Registration",
        "If this email can be registered, we’ve sent a confirmation link. If you already have an account, try signing in or resetting your password.",
        [
          { text: "Sign in", onPress: () => nav.navigate("SignIn" as never) },
          { text: "OK", style: "cancel" },
        ],
      );
    } catch (e: any) {
      console.warn("SignUp error:", e);
      const raw = (() => {
        try {
          return JSON.stringify(e);
        } catch {
          return String(e);
        }
      })();
      const msg =
        e?.message ||
        (typeof e === "string" ? e : undefined) ||
        raw ||
        "Unknown error";
      if (/email rate limit/i.test(msg + " " + raw)) {
        const cooldown = 60;
        setCooldownSeconds(cooldown);
        Alert.alert(
          "Too many requests",
          "We sent several confirmation emails recently. Please wait a minute and try again, or try signing in / resetting your password.",
        );
        return;
      }

      if (
        /\balready\b|\bexists\b|\bduplicate\b|\bregistered\b|\buser exists\b/i.test(
          msg + " " + raw,
        )
      ) {
        Alert.alert(
          "Email already registered",
          "An account with that email already exists. Would you like to sign in instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Sign in", onPress: () => nav.navigate("SignIn" as never) },
          ],
        );
      } else {
        Alert.alert("Sign-up failed", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cooldownSeconds) return;
    const id = setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  const passwordScore = (p: string) => {
    let score = 0;
    if (!p) return 0;
    if (p.length >= 8) score += 1;
    if (p.length >= 12) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    return score;
  };

  const score = passwordScore(password);
  const strengthLabel = score <= 1 ? "Weak" : score <= 3 ? "Okay" : "Strong";
  const strengthColor =
    score <= 1 ? "#e02424" : score <= 3 ? "#ff8c00" : "#2ecc71";
  const minScoreRequired = 3;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to RunnerSensei</Text>
        <Text style={styles.desc}>
          Track your runs, earn XP, and build streaks. Create an account to get
          started.
        </Text>
        <Text style={styles.title}>Create account</Text>
        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.passwordRow}>
          <TextInput
            placeholder="Password"
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? "Hide password" : "Show password"
            }
          >
            <Text style={styles.toggleTxt}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </Pressable>
        </View>
        <TextInput
          placeholder="Confirm password"
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
        />
        {confirmPassword.length > 0 && password !== confirmPassword ? (
          <Text style={styles.mismatch}>Passwords do not match</Text>
        ) : null}
        <View style={styles.strengthRow}>
          <View style={styles.strengthBarBg}>
            <View
              style={[
                styles.strengthBarFill,
                {
                  width: `${(score / 5) * 100}%`,
                  backgroundColor: strengthColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.strengthLabel, { color: strengthColor }]}>
            {strengthLabel}
          </Text>
        </View>
        <Pressable
          style={[
            styles.btn,
            (loading ||
              score < minScoreRequired ||
              password !== confirmPassword) && { opacity: 0.6 },
          ]}
          onPress={onSubmit}
          disabled={
            loading || score < minScoreRequired || password !== confirmPassword
          }
        >
          <Text style={styles.btnTxt}>
            {loading ? "Creating…" : "Create account"}
          </Text>
        </Pressable>
        <Pressable onPress={() => nav.navigate("SignIn" as never)}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
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
  mismatch: { color: "#e02424", marginBottom: 8, fontWeight: "700" },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 64 },
  toggle: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  toggleTxt: { color: "#1a1a2e", fontWeight: "700" },
  strengthRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  strengthBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 8,
  },
  strengthBarFill: { height: "100%" },
  strengthLabel: { width: 60, textAlign: "right", fontWeight: "700" },
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

