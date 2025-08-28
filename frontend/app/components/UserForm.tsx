import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Control, Controller, FieldErrors } from 'react-hook-form';

interface UserFormData {
  fullName: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  facilityId: string;
}

interface UserFormProps {
  control: Control<UserFormData>;
  errors: FieldErrors<UserFormData>;
  facilities: { id: number; name: string }[];
}

const UserForm: React.FC<UserFormProps> = ({ control, errors, facilities }) => {
  return (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name</Text>
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Enter full name"
            />
          )}
          name="fullName"
          rules={{ required: 'Full name is required' }}
        />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Enter username"
              autoCapitalize="none"
            />
          )}
          name="username"
          rules={{ required: 'Username is required' }}
        />
        {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
          name="email"
          rules={{ 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          }}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Enter password (optional)"
              secureTextEntry
            />
          )}
          name="password"
        />
        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Role</Text>
        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <View style={styles.pickerContainer}>
              <Picker selectedValue={value} onValueChange={onChange}>
                <Picker.Item label="Select a role" value="" />
                <Picker.Item label="Administrator" value="administrator" />
                <Picker.Item label="Supervisor" value="supervisor" />
                <Picker.Item label="Healthcare Worker" value="healthcare_worker" />
              </Picker>
            </View>
          )}
          name="role"
          rules={{ required: 'Role is required' }}
        />
        {errors.role && <Text style={styles.errorText}>{errors.role.message}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Facility</Text>
        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <View style={styles.pickerContainer}>
              <Picker selectedValue={value} onValueChange={onChange}>
                <Picker.Item label="Select a facility" value="" />
                {facilities.map((facility) => (
                  <Picker.Item
                    key={facility.id}
                    label={facility.name}
                    value={facility.id.toString()}
                  />
                ))}
              </Picker>
            </View>
          )}
          name="facilityId"
          rules={{ required: 'Facility is required' }}
        />
        {errors.facilityId && <Text style={styles.errorText}>{errors.facilityId.message}</Text>}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
  },
  errorText: {
    color: '#dc3545',
    marginTop: 4,
  },
});

export default UserForm;