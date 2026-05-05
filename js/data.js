/**
 * data.js
 * Static data – application types, their required fields and file requirements.
 */

import { loadLocal, saveLocal } from './utils.js';

const SERVICE_TYPES_STORAGE_KEY = 'rhu_service_types';

/** @type {Array<{id:string, name:string, icon:string, description:string, fields:Array, files:Array}>} */
const DEFAULT_APPLICATION_TYPES = [
  {
    id: 'permit_disinter_exhume',
    name: 'Issuance of Permit to Disinter / Exhume',
    icon: '⚱️',
    description: 'Service for requesting authorization to disinter or exhume human remains.',
    fee: 570,
    requirements: [
      'Request Letter addressed to the Municipal Health Officer stating the name, address, and purpose of request for exhumation/disinterment.',
      'Authorization Letter from the relative/family member of the deceased, required only when the requester is not an immediate family member.',
      'Photocopy of Death Certificate. For disinterment/exhumation, burial after three (3) years is allowed if the cause of death is not a dangerous communicable disease; if the cause of death is a dangerous communicable disease, burial must have lapsed for five (5) years.',
      'Reburial Permit from the place of reinterment, such as a cemetery, memorial park, or other legal burial ground.',
      'Permit/Approval from the Director of CHD-MIMAROPA for special cases, including exhumation for autopsy of a cadaver buried less than the prescribed period in PD 856 – Chapter XXI.',
    ],
    workflow: [
      'Client fills up basic information along with contact information.',
      'Client uploads the required files.',
      'After verification, client can proceed with payment.',
      'Client uploads the receipt after payment.',
      'Once permit is ready, client comes to the main office to claim the permit.',
    ],
    fields: [
      { name: 'deceased_name',    label: 'Name of Deceased',              type: 'text',     required: true },
      { name: 'cemetery_name',    label: 'Cemetery / Burial Site',        type: 'text',     required: true },
      { name: 'location',         label: 'Location',                      type: 'text',     required: true },
      { name: 'reason',           label: 'Reason for Disinterment/Exhumation', type: 'textarea', required: true },
      { name: 'target_date',      label: 'Requested Date',                type: 'date',     required: true },
    ],
    files: [
      {
        name: 'request_letter',
        label: 'Request Letter addressed to the Municipal Health Officer',
        required: true,
      },
      {
        name: 'authorization_letter',
        label: 'Authorization Letter from relative / immediate family',
        required: false,
        note: 'Required only if the requester is not an immediate family member.',
      },
      {
        name: 'death_certificate',
        label: 'Photocopy of Death Certificate',
        required: true,
        note: 'For disinterment/exhumation requests.',
      },
      {
        name: 'reburial_permit',
        label: 'Reburial Permit from place of reinterment',
        required: true,
      },
      {
        name: 'chd_mimaropa_approval',
        label: 'Permit / Approval from the Director of CHD-MIMAROPA',
        required: false,
        note: 'For special cases under PD 856 – Chapter XXI.',
      },
    ],
  },
  {
    id: 'permit_transfer_cadaver',
    name: 'Issuance of Permit to Transfer Cadaver',
    icon: '🚐',
    description: 'Service for requesting authorization to transfer a cadaver to another location.',
    fee: 140,
    requirements: [
      'Request Letter addressed to the Municipal Health Officer stating the name, address, and purpose of request for transferring of cadaver.',
      'Authorization Letter from the relative / family member of the dead. Required only if a non family member is requesting for Permit to Transfer.',
      'Photocopy of Death Certificate - For Permit to Transfer (New deaths, cause of death is not due to a dangerous communicable disease.)',
      'Burial Permit for New Death',
    ],
    workflow: [
      'Client fills up basic information along with contact information.',
      'Client uploads the required files.',
      'After verification, client can proceed with payment.',
      'Client uploads the receipt after payment.',
      'Once permit is ready, client comes to the main office to claim the permit.',
    ],
    fields: [
      { name: 'deceased_name',    label: 'Name of Deceased',              type: 'text',   required: true },
      { name: 'origin',           label: 'Origin of Transfer',            type: 'text',   required: true },
      { name: 'destination',      label: 'Destination',                   type: 'text',   required: true },
      { name: 'target_date',      label: 'Date of Transfer',              type: 'date',   required: true },
      { name: 'transport_mode',   label: 'Mode of Transport',             type: 'text',   required: true },
    ],
    files: [
      {
        name: 'request_letter',
        label: 'Request Letter addressed to the Municipal Health Officer',
        required: true,
      },
      {
        name: 'authorization_letter',
        label: 'Authorization Letter from the relative / family member of the dead',
        required: false,
        note: 'Required only if a non family member is requesting for Permit to Transfer.',
      },
      {
        name: 'death_certificate',
        label: 'Photocopy of Death Certificate',
        required: true,
        note: 'For Permit to Transfer (New deaths, cause of death is not due to a dangerous communicable disease.)',
      },
      {
        name: 'burial_permit',
        label: 'Burial Permit for New Death',
        required: true,
      },
    ],
  },
  {
    id: 'permit_exhume_transfer_cadaver',
    name: 'Issuance of Permit to Exhume and Transfer Cadaver',
    icon: '🛣️',
    description: 'Combined permit service for exhumation and cadaver transfer requests.',
    fee: 550,
    requirements: [
      'Request Letter addressed to the Municipal Health Officer stating the name, address, and purpose of request for exhumation / disinterment and transfer.',
      'Authorization Letter from the relative / family member of the dead. Required only if a non family member is requesting for Permit to Transfer.',
      'Photocopy of Death Certificate - For Permit to Disinter/Exhumation (cause of death is other than dangerous communicable disease, permission may be granted after such bodies have been buried for the period of three (3) years. While if cause of death is due to any dangerous communicable disease, shall be exhumed after lapse of five (5) years after burial.)',
      'Reburial Permit',
      'Permit / Approval from the Director of CHD-MIMAROPA (For special cases, exhumation for autopsy of cadaver buried less than the prescribed period in PD 856 – Chapter XXI)',
    ],
    workflow: [
      'Client fills up basic information along with contact information.',
      'Client uploads the required files.',
      'After verification, client can proceed with payment.',
      'Client uploads the receipt after payment.',
      'Once permit is ready, client comes to the main office to claim the permit.',
    ],
    fields: [
      { name: 'deceased_name',    label: 'Name of Deceased',              type: 'text',     required: true },
      { name: 'exhumation_site',  label: 'Exhumation Site',               type: 'text',     required: true },
      { name: 'destination',      label: 'Destination of Transfer',       type: 'text',     required: true },
      { name: 'reason',           label: 'Reason for Exhumation and Transfer', type: 'textarea', required: true },
      { name: 'target_date',      label: 'Requested Date',                type: 'date',     required: true },
    ],
    files: [
      {
        name: 'request_letter',
        label: 'Request Letter addressed to the Municipal Health Officer',
        required: true,
      },
      {
        name: 'authorization_letter',
        label: 'Authorization Letter from the relative / family member of the dead',
        required: false,
        note: 'Required only if a non family member is requesting for Permit to Transfer.',
      },
      {
        name: 'death_certificate',
        label: 'Photocopy of Death Certificate',
        required: true,
        note: 'For Permit to Disinter/Exhumation (cause of death is other than dangerous communicable disease, permission may be granted after such bodies have been buried for the period of three (3) years. While if cause of death is due to any dangerous communicable disease, shall be exhumed after lapse of five (5) years after burial.)',
      },
      {
        name: 'reburial_permit',
        label: 'Reburial Permit',
        required: true,
      },
      {
        name: 'chd_mimaropa_approval',
        label: 'Permit / Approval from the Director of CHD-MIMAROPA',
        required: false,
        note: 'For special cases, exhumation for autopsy of cadaver buried less than the prescribed period in PD 856 – Chapter XXI.',
      },
    ],
  },
  {
    id: 'certificate_potability',
    name: 'Issuance of Certificate of Potability',
    icon: '💧',
    description: 'Service for requesting certification that a water source is potable.',
    fee: 170,
    requirements: [
      'Latest three (3) months result / certificate of analysis of microbiological / bacteriological water test (Original & photo copy).',
      'For water refilling station, semi-annual result / certificate of analysis of physical-chemical tests (Original & photocopy). All other establishment, annual result / certificate of analysis of physical-chemical tests (Original & photocopy).',
    ],
    workflow: [
      'Client fills up basic information along with contact information.',
      'Client uploads the required files.',
      'After verification, client can proceed with payment.',
      'Client uploads the receipt after payment.',
      'Once certificate is ready, client comes to the main office to claim the certificate.',
    ],
    fields: [
      { name: 'water_source_name', label: 'Water Source / Facility Name', type: 'text',   required: true },
      { name: 'source_location',   label: 'Location',                     type: 'text',   required: true },
      { name: 'owner_operator',    label: 'Owner / Operator',             type: 'text',   required: true },
      { name: 'source_type',       label: 'Type of Water Source',         type: 'select', required: true,
        options: ['Refilling Station', 'Deep Well', 'Spring', 'Piped Water', 'Other'] },
      { name: 'sample_date',       label: 'Date of Water Sampling',       type: 'date',   required: true },
    ],
    files: [
      {
        name: 'microbiological_water_test',
        label: 'Latest three (3) months result / certificate of analysis of microbiological / bacteriological water test',
        required: true,
        note: 'Original and photocopy required.',
      },
      {
        name: 'physical_chemical_water_test',
        label: 'Result / certificate of analysis of physical-chemical tests',
        required: true,
        note: 'For water refilling station, semi-annual result is required. All other establishment requires annual result. Original and photocopy required.',
      },
    ],
  },
  {
    id: 'health_card_food_handlers_yellow',
    name: 'Issuance of Health Card for Food Handlers (Yellow)',
    icon: '🟨',
    description: 'Service for issuance of yellow health cards for food handlers.',
    fee: 390,
    requirements: [
      'Fully Accomplished Health Card application form (Yellow Card)',
      'Proof of valid Food Handlers Training / Seminar (to be uploaded after attending the scheduled training)',
      'Laboratory examination results: X-ray (valid for 6 months), CBC, Urinalysis, Fecalysis, and Hepa-A (valid for 3 months) - to be uploaded after testing',
      'Note: All results with abnormal laboratory findings shall be referred to a physician for appropriate treatment.',
      'Deworming record (to be submitted after attending deworming session)',
      'Proof of valid HIV Seminar (to be uploaded after attending the scheduled seminar)',
      "Additional requirements for below 18 years old applicant: Parental / Guardian's Consent (Original), Birth Certificate, and Valid ID of parent / guardian giving the consent.",
    ],
    workflow: [
      'Client presents original and photocopies of basic information and identification.',
      'Client proceeds to MTO (Municipal Treasurer\'s Office) to pay Health Card - Food Handlers (Yellow) fee.',
      'NARRA MHO schedules Food Handlers Training / Seminar.',
      'Client attends Food Handlers Training / Seminar and receives proof of attendance.',
      'Client uploads proof of Food Handlers Training via the "Upload Additional Documents" portal.',
      'NARRA MHO schedules HIV Seminar.',
      'Client attends HIV Seminar and receives proof of attendance.',
      'Client uploads proof of HIV Seminar via the "Upload Additional Documents" portal.',
      'Client undergoes medical examinations (X-ray, CBC, Urinalysis, Fecalysis, Hepa-A) at designated laboratory.',
      'Client uploads laboratory examination results via the "Upload Additional Documents" portal.',
      'Client performs deworming.',
      'Client uploads deworming record via the "Upload Additional Documents" portal.',
      'Once all documents are verified and Health Card is ready, client comes to the main office to claim the card.',
    ],
    fields: [
      { name: 'full_name',           label: 'Full Name',                    type: 'text',   required: true },
      { name: 'date_of_birth',       label: 'Date of Birth',                type: 'date',   required: true },
      { name: 'employer_name',       label: 'Employer / Establishment',     type: 'text',   required: true },
      { name: 'job_title',           label: 'Position / Role',              type: 'text',   required: true },
      { name: 'work_address',        label: 'Work Address',                 type: 'text',   required: true },
    ],
    files: [
      {
        name: 'health_card_application_form',
        label: 'Fully Accomplished Health Card application form (Yellow Card)',
        required: true,
      },
      {
        name: 'food_handlers_training',
        label: 'Proof of valid Food Handlers Training / Seminar conducted by MHO-Ensan Unit or other related agency or institution',
        required: false,
        note: 'To be uploaded after attending the scheduled training. Upload via the "Upload Additional Documents" portal using your reference number.',
      },
      {
        name: 'lab_results',
        label: 'Laboratory result / examination: X-ray, CBC, Urinalysis, Fecalysis, and Hepa-A',
        required: false,
        note: 'X-ray is valid for 6 months; CBC, Urinalysis, Fecalysis, and Hepa-A are valid for 3 months. All abnormal findings must be addressed by a physician. Upload via the "Upload Additional Documents" portal.',
      },
      {
        name: 'hiv_seminar',
        label: 'Proof of valid HIV Seminar',
        required: false,
        note: '1 original, to be uploaded after attending the scheduled seminar. Upload via the "Upload Additional Documents" portal using your reference number.',
      },
      {
        name: 'deworming',
        label: 'Deworming Record',
        required: false,
        note: 'To be submitted after deworming. Upload via the "Upload Additional Documents" portal.',
      },
      {
        name: 'parental_consent',
        label: 'Parental / Guardian’s Consent',
        required: false,
        note: 'Required for below 18 years old applicant.',
      },
      {
        name: 'birth_certificate',
        label: 'Birth Certificate',
        required: false,
        note: 'Required for below 18 years old applicant.',
      },
      {
        name: 'guardian_valid_id',
        label: 'Valid ID of parent / guardian giving the consent',
        required: false,
        note: 'Required for below 18 years old applicant.',
      },
    ],
  },
  {
    id: 'health_card_non_food_handlers_green',
    name: 'Issuance of Health Card for Non-Food Handlers (Green)',
    icon: '🟩',
    description: 'Service for issuance of green health cards for non-food handlers.',
    fields: [
      { name: 'full_name',           label: 'Full Name',                    type: 'text',   required: true },
      { name: 'date_of_birth',       label: 'Date of Birth',                type: 'date',   required: true },
      { name: 'employer_name',       label: 'Employer / Organization',      type: 'text',   required: true },
      { name: 'job_title',           label: 'Position / Role',              type: 'text',   required: true },
      { name: 'work_address',        label: 'Work Address',                 type: 'text',   required: true },
    ],
    files: [],
  },
  {
    id: 'provisional_sanitary_permit_new_business',
    name: 'Issuance of Provisional Sanitary Permit for New Business Application',
    icon: '🏪',
    description: 'Service for provisional sanitary permit requests by newly established businesses.',
    fields: [
      { name: 'business_name',       label: 'Business Name',               type: 'text',   required: true },
      { name: 'business_address',    label: 'Business Address',            type: 'text',   required: true },
      { name: 'owner_name',          label: 'Owner / Operator Name',       type: 'text',   required: true },
      { name: 'business_nature',     label: 'Nature of Business',          type: 'text',   required: true },
      { name: 'target_opening_date', label: 'Target Opening Date',         type: 'date',   required: true },
    ],
    files: [],
  },
  {
    id: 'sanitary_permit_new_renewal',
    name: 'Issuance of New and Renewal Sanitary Permit Application',
    icon: '📄',
    description: 'Service for filing either a new sanitary permit or a renewal application.',
    fields: [
      { name: 'application_variant', label: 'Application Type',            type: 'select', required: true,
        options: ['New Permit', 'Renewal'] },
      { name: 'business_name',       label: 'Business / Establishment Name', type: 'text', required: true },
      { name: 'business_address',    label: 'Business Address',            type: 'text',   required: true },
      { name: 'owner_name',          label: 'Owner / Operator Name',       type: 'text',   required: true },
      { name: 'business_nature',     label: 'Nature of Business',          type: 'text',   required: true },
    ],
    files: [],
  },
];

function cloneServiceType(type) {
  return JSON.parse(JSON.stringify(type));
}

function normalizeServiceType(type, fallback = null) {
  const source = type || fallback;
  if (!source) return null;

  return {
    ...cloneServiceType(source),
    id: source.id,
    name: source.name || '',
    icon: source.icon || '',
    description: source.description || '',
    fee: typeof source.fee === 'number' ? source.fee : Number(source.fee) || 0,
    requirements: Array.isArray(source.requirements) ? source.requirements : [],
    workflow: Array.isArray(source.workflow) ? source.workflow : [],
    fields: Array.isArray(source.fields) ? source.fields : [],
    files: Array.isArray(source.files) ? source.files : [],
  };
}

function loadServiceTypes() {
  const stored = loadLocal(SERVICE_TYPES_STORAGE_KEY, null);
  const source = Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_APPLICATION_TYPES;
  return source.map(type => normalizeServiceType(type)).filter(Boolean);
}

function persistServiceTypes(types) {
  APPLICATION_TYPES = types.map(type => normalizeServiceType(type)).filter(Boolean);
  saveLocal(SERVICE_TYPES_STORAGE_KEY, APPLICATION_TYPES);
  return APPLICATION_TYPES;
}

let APPLICATION_TYPES = loadServiceTypes();

function humanizeTypeId(typeId) {
  if (!typeId) return '—';
  return typeId
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getApplicationTypeById(typeId) {
  return APPLICATION_TYPES.find(t => t.id === typeId) || null;
}

function getApplicationTypeName(typeId) {
  const type = getApplicationTypeById(typeId);
  return type ? type.name : humanizeTypeId(typeId);
}

function getApplicationTypes() {
  return APPLICATION_TYPES.map(type => cloneServiceType(type));
}

function updateApplicationType(typeId, updates) {
  const index = APPLICATION_TYPES.findIndex(type => type.id === typeId);
  if (index === -1) return null;

  const nextType = normalizeServiceType({
    ...APPLICATION_TYPES[index],
    ...updates,
    id: typeId,
  }, APPLICATION_TYPES[index]);

  const nextTypes = APPLICATION_TYPES.slice();
  nextTypes[index] = nextType;
  persistServiceTypes(nextTypes);
  return cloneServiceType(nextType);
}

function resetApplicationType(typeId) {
  const defaultType = DEFAULT_APPLICATION_TYPES.find(type => type.id === typeId);
  if (!defaultType) return null;

  const index = APPLICATION_TYPES.findIndex(type => type.id === typeId);
  if (index === -1) return null;

  const nextTypes = APPLICATION_TYPES.slice();
  nextTypes[index] = normalizeServiceType(defaultType);
  persistServiceTypes(nextTypes);
  return cloneServiceType(nextTypes[index]);
}

function resetAllApplicationTypes() {
  persistServiceTypes(DEFAULT_APPLICATION_TYPES.map(type => normalizeServiceType(type)));
  return getApplicationTypes();
}

export {
  APPLICATION_TYPES,
  getApplicationTypes,
  getApplicationTypeById,
  getApplicationTypeName,
  updateApplicationType,
  resetApplicationType,
  resetAllApplicationTypes,
};
