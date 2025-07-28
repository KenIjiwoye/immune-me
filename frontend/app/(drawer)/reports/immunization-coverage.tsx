import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function ImmunizationCoverageScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Immunization Coverage' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Immunization Coverage Report</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
});