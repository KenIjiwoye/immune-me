// @ts-nocheck
import React from 'react';
import { render } from '@testing-library/react-native';
import AddImmunizationScreen from '../add';

// Mock the expo-router
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ patientId: '1' }),
  useRouter: () => ({
    back: jest.fn(),
  }),
}));

// Mock the API
jest.mock('../../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('AddImmunizationScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<AddImmunizationScreen />);
    expect(getByText('Add Immunization Record')).toBeTruthy();
  });

  it('shows patient selection when no patientId provided', () => {
    jest.mock('expo-router', () => ({
      useLocalSearchParams: () => ({}),
      useRouter: () => ({
        back: jest.fn(),
      }),
    }));
    
    const { getByText } = render(<AddImmunizationScreen />);
    expect(getByText('Select Patient')).toBeTruthy();
  });
});