// HomeScreen.js
import React from "react";
import { View, Button, StyleSheet, TouchableOpacity, Text } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Scanner")}
      >
        <Text
          style={{
            fontSize: 30,
            color: "white",
            padding: 20,
            fontWeight: "500",
          }}
        >
          {" "}
          Start Scanning{" "}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    borderRadius: 8,
    backgroundColor: "#DC4F00",
  },
});
