import React from "react";
import { TextInput, StyleSheet } from "react-native";

const COLORS = {
  white: "#ffffff",
  black: "#000000",
};

const InputField = (props: React.ComponentProps<typeof TextInput>) => {
  return <TextInput style={styles.inputField} {...props} />;
};

export default InputField;

const styles = StyleSheet.create({
  inputField: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: "stretch",
    borderRadius: 5,
    fontSize: 16,
    color: COLORS.black,
    width: "60%",
  },
});
