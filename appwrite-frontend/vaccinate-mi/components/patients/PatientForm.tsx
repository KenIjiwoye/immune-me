import React, { useState } from 'react';
import {
    ScrollView,
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Layout, Text, Input, Button, Select, SelectItem, Datepicker, IndexPath } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import type { Patient } from '../../types/appwrite';

interface PatientFormData {
    full_name: string;
    sex: string;
    date_of_birth: Date;
    mother_name: string;
    father_name: string;
    district: string;
    town_village: string;
    address: string;
    contact_phone: string;
    health_worker_id?: string;
    health_worker_name?: string;
    health_worker_phone?: string;
    health_worker_address?: string;
    facility_id: string;
}

interface PatientFormProps {
    initialData?: Partial<Patient>;
    facilityId: string;
    onSave: (data: PatientFormData) => void;
    onCancel: () => void;
    mode: 'new' | 'edit';
}

const DISTRICTS = [
    'Belize',
    'Cayo',
    'Corozal',
    'Orange Walk',
    'Stann Creek',
    'Toledo',
];

const SEX_OPTIONS = ['M', 'F'];

export default function PatientForm({
    initialData,
    facilityId,
    onSave,
    onCancel,
    mode,
}: PatientFormProps) {
    const [formData, setFormData] = useState<PatientFormData>({
        full_name: initialData?.full_name || '',
        sex: initialData?.sex || '',
        date_of_birth: initialData?.date_of_birth ? new Date(initialData.date_of_birth) : new Date(),
        mother_name: initialData?.mother_name || '',
        father_name: initialData?.father_name || '',
        district: initialData?.district || '',
        town_village: initialData?.town_village || '',
        address: initialData?.address || '',
        contact_phone: initialData?.contact_phone || '',
        health_worker_name: initialData?.health_worker_name || '',
        health_worker_phone: initialData?.health_worker_phone || '',
        health_worker_address: initialData?.health_worker_address || '',
        facility_id: initialData?.facility_id || facilityId,
    });

    const [selectedSexIndex, setSelectedSexIndex] = useState<IndexPath>(
        new IndexPath(initialData?.sex ? SEX_OPTIONS.indexOf(initialData.sex) : 0)
    );

    const [selectedDistrictIndex, setSelectedDistrictIndex] = useState<IndexPath>(
        new IndexPath(initialData?.district ? DISTRICTS.indexOf(initialData.district) : 0)
    );

    const [errors, setErrors] = useState<Partial<Record<keyof PatientFormData, string>>>({});

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof PatientFormData, string>> = {};

        if (!formData.full_name.trim()) {
            newErrors.full_name = 'Full name is required';
        }

        if (!formData.sex) {
            newErrors.sex = 'Sex is required';
        }

        if (!formData.district) {
            newErrors.district = 'District is required';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSave(formData);
        }
    };

    const updateField = (field: keyof PatientFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const renderCalendarIcon = (props: any) => (
        <Ionicons {...props} name="calendar-outline" size={20} color="#8F9BB3" />
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Basic Information */}
                <View style={styles.section}>
                    <Text category="h6" style={styles.sectionTitle}>
                        Basic Information
                    </Text>

                    <Input
                        label="Full Name *"
                        placeholder="Enter full name"
                        value={formData.full_name}
                        onChangeText={(text) => updateField('full_name', text)}
                        status={errors.full_name ? 'danger' : 'basic'}
                        caption={errors.full_name}
                        style={styles.input}
                    />

                    <Select
                        label="Sex *"
                        placeholder="Select sex"
                        value={SEX_OPTIONS[selectedSexIndex.row]}
                        selectedIndex={selectedSexIndex}
                        onSelect={(index) => {
                            const idx = index as IndexPath;
                            setSelectedSexIndex(idx);
                            updateField('sex', SEX_OPTIONS[idx.row]);
                        }}
                        status={errors.sex ? 'danger' : 'basic'}
                        caption={errors.sex}
                        style={styles.input}
                    >
                        {SEX_OPTIONS.map((sex) => (
                            <SelectItem key={sex} title={sex} />
                        ))}
                    </Select>

                    <Datepicker
                        label="Date of Birth *"
                        date={formData.date_of_birth}
                        onSelect={(date) => updateField('date_of_birth', date)}
                        accessoryRight={renderCalendarIcon}
                        style={styles.input}
                    />
                </View>

                {/* Parent Information */}
                <View style={styles.section}>
                    <Text category="h6" style={styles.sectionTitle}>
                        Parent/Guardian Information
                    </Text>

                    <Input
                        label="Mother's Name"
                        placeholder="Enter mother's name"
                        value={formData.mother_name}
                        onChangeText={(text) => updateField('mother_name', text)}
                        style={styles.input}
                    />

                    <Input
                        label="Father's Name"
                        placeholder="Enter father's name"
                        value={formData.father_name}
                        onChangeText={(text) => updateField('father_name', text)}
                        style={styles.input}
                    />
                </View>

                {/* Location Information */}
                <View style={styles.section}>
                    <Text category="h6" style={styles.sectionTitle}>
                        Location Information
                    </Text>

                    <Select
                        label="District *"
                        placeholder="Select district"
                        value={DISTRICTS[selectedDistrictIndex.row]}
                        selectedIndex={selectedDistrictIndex}
                        onSelect={(index) => {
                            const idx = index as IndexPath;
                            setSelectedDistrictIndex(idx);
                            updateField('district', DISTRICTS[idx.row]);
                        }}
                        status={errors.district ? 'danger' : 'basic'}
                        caption={errors.district}
                        style={styles.input}
                    >
                        {DISTRICTS.map((district) => (
                            <SelectItem key={district} title={district} />
                        ))}
                    </Select>

                    <Input
                        label="Town/Village"
                        placeholder="Enter town or village"
                        value={formData.town_village}
                        onChangeText={(text) => updateField('town_village', text)}
                        style={styles.input}
                    />

                    <Input
                        label="Address *"
                        placeholder="Enter full address"
                        value={formData.address}
                        onChangeText={(text) => updateField('address', text)}
                        multiline
                        numberOfLines={3}
                        textStyle={styles.multilineText}
                        status={errors.address ? 'danger' : 'basic'}
                        caption={errors.address}
                        style={styles.input}
                    />
                </View>

                {/* Contact Information */}
                <View style={styles.section}>
                    <Text category="h6" style={styles.sectionTitle}>
                        Contact Information
                    </Text>

                    <Input
                        label="Contact Phone"
                        placeholder="Enter phone number"
                        value={formData.contact_phone}
                        onChangeText={(text) => updateField('contact_phone', text)}
                        keyboardType="phone-pad"
                        style={styles.input}
                    />
                </View>

                {/* Health Worker Information */}
                <View style={styles.section}>
                    <Text category="h6" style={styles.sectionTitle}>
                        Assigned Health Worker (Optional)
                    </Text>

                    <Input
                        label="Health Worker Name"
                        placeholder="Enter health worker name"
                        value={formData.health_worker_name}
                        onChangeText={(text) => updateField('health_worker_name', text)}
                        style={styles.input}
                    />

                    <Input
                        label="Health Worker Phone"
                        placeholder="Enter health worker phone"
                        value={formData.health_worker_phone}
                        onChangeText={(text) => updateField('health_worker_phone', text)}
                        keyboardType="phone-pad"
                        style={styles.input}
                    />

                    <Input
                        label="Health Worker Address"
                        placeholder="Enter health worker address"
                        value={formData.health_worker_address}
                        onChangeText={(text) => updateField('health_worker_address', text)}
                        multiline
                        numberOfLines={2}
                        textStyle={styles.multilineText}
                        style={styles.input}
                    />
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <Button
                        style={styles.button}
                        appearance="outline"
                        onPress={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        style={styles.button}
                        onPress={handleSubmit}
                    >
                        {mode === 'new' ? 'Create Patient' : 'Update Patient'}
                    </Button>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        marginBottom: 16,
        fontWeight: '600',
    },
    input: {
        marginBottom: 16,
    },
    multilineText: {
        minHeight: 64,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    button: {
        flex: 1,
    },
});
