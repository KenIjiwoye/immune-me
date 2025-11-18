import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useUndoRedo } from '../hooks/useUndoRedo';

interface UndoRedoControlsProps {
  style?: any;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({ style }) => {
  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.button, !canUndo && styles.disabled]}
        onPress={undo}
        disabled={!canUndo}
      >
        <Text style={[styles.buttonText, !canUndo && styles.disabledText]}>Undo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !canRedo && styles.disabled]}
        onPress={redo}
        disabled={!canRedo}
      >
        <Text style={[styles.buttonText, !canRedo && styles.disabledText]}>Redo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  disabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999999',
  },
});