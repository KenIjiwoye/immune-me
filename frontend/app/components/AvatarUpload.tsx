import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface AvatarUploadProps {
  uri?: string;
  onImageSelected: (uri: string) => void;
  size?: number;
  editable?: boolean;
}

export default function AvatarUpload({ 
  uri, 
  onImageSelected, 
  size = 100, 
  editable = true 
}: AvatarUploadProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const pickImage = async () => {
    try {
      setIsLoading(true);
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={editable ? pickImage : undefined}
      disabled={!editable}
    >
      {uri ? (
        <Image source={{ uri }} style={[styles.avatar, { width: size, height: size }]} />
      ) : (
        <View style={[styles.initialsAvatar, { width: size, height: size }]}>
          <Ionicons name="person" size={size * 0.4} color="#fff" />
        </View>
      )}
      
      {editable && (
        <View style={[styles.editButton, { width: size * 0.32, height: size * 0.32 }]}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="camera" size={size * 0.16} color="#fff" />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    borderRadius: 50,
  },
  initialsAvatar: {
    borderRadius: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007bff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});