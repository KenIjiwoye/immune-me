import { facilitySchema, createFacilitySchema, updateFacilitySchema } from '../facility';

describe('Facility Schema Validation', () => {
  const validFacilityData = {
    name: 'Central Hospital',
    district: 'District A',
    address: '123 Main St',
    contactPhone: '+1234567890',
    contact_phone: '+1234567890',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  const validCreateData = {
    name: 'Central Hospital',
    district: 'District A',
    address: '123 Main St',
    contactPhone: '+1234567890',
  };

  describe('facilitySchema', () => {
    it('should validate a complete facility object', () => {
      const result = facilitySchema.safeParse(validFacilityData);
      expect(result.success).toBe(true);
    });

    it('should require either contactPhone or contact_phone', () => {
      const dataWithoutContact = {
        ...validFacilityData,
        contactPhone: undefined,
        contact_phone: undefined,
      };
      const result = facilitySchema.safeParse(dataWithoutContact);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Either contactPhone or contact_phone must be provided');
    });

    it('should validate name length', () => {
      const dataWithLongName = {
        ...validFacilityData,
        name: 'a'.repeat(101), // 101 characters
      };
      const result = facilitySchema.safeParse(dataWithLongName);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('must be less than 100 characters');
    });
  });

  describe('createFacilitySchema', () => {
    it('should validate create data', () => {
      const result = createFacilitySchema.safeParse(validCreateData);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const dataWithoutName = { ...validCreateData };
      delete dataWithoutName.name;
      const result = createFacilitySchema.safeParse(dataWithoutName);
      expect(result.success).toBe(false);
    });
  });

  describe('updateFacilitySchema', () => {
    it('should allow partial updates', () => {
      const result = updateFacilitySchema.safeParse({ name: 'Updated Hospital' });
      expect(result.success).toBe(true);
    });
  });
});