export const SETTINGS_VERSION = 1;

export const defaultSettings = {
    version: SETTINGS_VERSION,
    // --- préférences UI/app ---
    theme: "winter",          // "light" | "dark"
    locale: "fr-FR",
    density: "comfortable",  // "comfortable" | "compact"
    // --- endpoints / URLs connues par l'UI ---
    apiBaseUrl: "/api",
    // --- flags fonctionnels ---
    showBeta: false,
    ref_niveau_sets_v1: [
        {id: "set-classique", code: "CLASSIQUE", libelle: "Mini → Bien etre", ordre: 1, is_enabled: true},
        {id: "set-numerique", code: "N1..N6", libelle: "Niveau 1 → 6", ordre: 2, is_enabled: true},
        {
            "id": "set-prevoyance-unique",
            "code": "PREV",
            "libelle": "Prévoyance — niveau unique",
            "ordre": 3,
            "is_enabled": true,
            "allow_multiple_niveaux": false,
            "risque": "prevoyance"
        }
    ],
    ref_niveaux_v1: [
        {
            "id": "niv-base",
            "code": "BASE",
            "libelle": "Niveau de base",
            "ordre": 1,
            "is_enabled": false,
            "ref_set_id": "set-classique"
        },
        {
            "id": "niv-essentiel",
            "code": "ESSENTIEL",
            "libelle": "Couverture essentielle",
            "ordre": 2,
            "is_enabled": false,
            "ref_set_id": "set-classique"
        },
        {
            "id": "niv-renforce",
            "code": "RENFORCE",
            "libelle": "Renforcé",
            "ordre": 3,
            "is_enabled": false,
            "ref_set_id": "set-classique"
        },
        {
            "id": "niv-premium",
            "code": "PREMIUM",
            "libelle": "Premium",
            "ordre": 4,
            "is_enabled": false,
            "ref_set_id": "set-classique"
        },
        {
            "id": "5dfa0ab1-02e1-45ef-9bfa-7e470fc7175b",
            "code": "MINI",
            "libelle": "MINI",
            "ordre": 5,
            "is_enabled": true,
            "ref_set_id": "set-classique"
        },
        {
            "id": "niv-elite",
            "code": "MEDIUM",
            "libelle": "MEDIUM",
            "ordre": 6,
            "is_enabled": false,
            "ref_set_id": "set-classique"
        },
        {
            "id": "niv-confort",
            "code": "CONFORT",
            "libelle": "CONFORT",
            "ordre": 7,
            "is_enabled": true,
            "ref_set_id": "set-classique"
        },
        {
            "id": "753c55d8-11f4-4d26-9eb8-605d7d2d61ba",
            "code": "BIENETRE",
            "libelle": "BIEN-ETRE",
            "ordre": 8,
            "is_enabled": true,
            "ref_set_id": "set-classique"
        },
        {
            "id": "niv-n1",
            "code": "N1",
            "libelle": "Niveau 1",
            "ordre": 1,
            "is_enabled": true,
            "ref_set_id": "set-numerique"
        },
        {
            "id": "niv-n2",
            "code": "N2",
            "libelle": "Niveau 2",
            "ordre": 2,
            "is_enabled": true,
            "ref_set_id": "set-numerique"
        },
        {
            "id": "niv-n3",
            "code": "N3",
            "libelle": "Niveau 3",
            "ordre": 3,
            "is_enabled": true,
            "ref_set_id": "set-numerique"
        },
        {
            "id": "niv-n4",
            "code": "N4",
            "libelle": "Niveau 4",
            "ordre": 4,
            "is_enabled": true,
            "ref_set_id": "set-numerique"
        },
        {
            "id": "niv-n5",
            "code": "N5",
            "libelle": "Niveau 5",
            "ordre": 5,
            "is_enabled": true,
            "ref_set_id": "set-numerique"
        },
        {
            "id": "niv-n6",
            "code": "N6",
            "libelle": "Niveau 6",
            "ordre": 6,
            "is_enabled": true,
            "ref_set_id": "set-numerique"
        },
        {
            "id": "niv-prev-base",
            "code": "BASE",
            "libelle": "Niveau unique prévoyance",
            "ordre": 1,
            "is_enabled": true,
            "ref_set_id": "set-prevoyance-unique"
        }
    ],
    ref_modules_v1: [
        {
            "id": "1f3d7b4e-9a2c-4d1e-b65a-5d2f8a9c3e71",
            "code": "HOSP",
            "libelle": "Hospitalisation",
            "ordre": 1,
            "risque": "sante"
        },
        {
            "id": "2a5b8c7d-3e1f-4a9b-8c6d-0e1f2a3b4c5d",
            "code": "DENTAIRE",
            "libelle": "Dentaire",
            "ordre": 2,
            "risque": "sante"
        },
        {
            "id": "3c6d9e0f-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
            "code": "OPTIQUE",
            "libelle": "Optique",
            "ordre": 3,
            "risque": "sante"
        },
        {
            "id": "4e7f0a1b-2c3d-4e5f-9a0b-1c2d3e4f5a6b",
            "code": "PHARMA",
            "libelle": "Pharmacie",
            "ordre": 4,
            "risque": "sante"
        },
        {
            "id": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
            "code": "CONSULT",
            "libelle": "Médecine / Consultations",
            "ordre": 5,
            "risque": "sante"
        },
        {
            "id": "6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e",
            "code": "MATERNITE",
            "libelle": "Maternité",
            "ordre": 6,
            "risque": "sante"
        },
        {
            "id": "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
            "code": "SOINS_INF",
            "libelle": "Soins infirmiers",
            "ordre": 7,
            "risque": "sante"
        },
        {
            "id": "8d9e0f1a-2b3c-4d5e-9f6a-7b8c9d0e1f2a",
            "code": "AUX_MED",
            "libelle": "Auxiliaires médicaux",
            "ordre": 8,
            "risque": "sante"
        },
        {
            "id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "code": "EQUIPEMENTS",
            "libelle": "Équipements et prothèses",
            "ordre": 9,
            "risque": "sante"
        },
        {
            "id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "code": "PREVENTION",
            "libelle": "Services - Prévention",
            "ordre": 10,
            "risque": "sante"
        },
        {
            "id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "SOINS_COURANTS",
            "libelle": "Soins courants",
            "ordre": 11,
            "risque": "sante"
        },
        {
            "id": "0ec2af6a-ede4-408d-874e-98dba7e61419",
            "code": "AIDES_AUDITIVES",
            "libelle": "Aides auditives",
            "ordre": 12,
            "risque": "sante"
        },
        {
            "id": "9602b034-5824-4923-8595-2c2f763eed36",
            "code": "DECES_EN_CAPITAL",
            "libelle": "Décès en capital",
            "ordre": 1,
            "risque": "prevoyance"
        },
        {
            "id": "5f18eea8-8b0e-45cb-bc70-9063a33f7088",
            "code": "FRAIS_OBSEQUES",
            "libelle": "Frais d'obsèques",
            "ordre": 2,
            "risque": "prevoyance"
        },
        {
            "id": "c0d1ac43-b659-44e0-95e7-38be7d590965",
            "code": "RENTE_EDUCATION",
            "libelle": "Rente éducation",
            "ordre": 3,
            "risque": "prevoyance"
        },
        {
            "id": "976c2d7d-4c00-407c-8d63-50a27cd2a223",
            "code": "RENTE_CONJOINT",
            "libelle": "Rente de conjoint",
            "ordre": 4,
            "risque": "prevoyance"
        },
        {
            "id": "eb10e62a-4d35-4d95-8ee7-f13d17fdbdca",
            "code": "IT_IP",
            "libelle": "Arrêt de travail / Invalidité",
            "ordre": 5,
            "risque": "prevoyance"
        },
        {
            "id": "b036d298-c07e-4622-b42e-27dc288fde11",
            "code": "SERVICES",
            "libelle": "Services",
            "ordre": 6,
            "risque": "prevoyance"
        },
    ],
    ref_categories_v1: [
        {
            "id": "a1b2c3d4-0001-4e11-9a10-111111111111",
            "ref_module_id": "1f3d7b4e-9a2c-4d1e-b65a-5d2f8a9c3e71",
            "code": "FRAIS_SEJOUR",
            "libelle": "Frais de séjour (hébergement, plateau technique)",
            "ordre": 1
        },
        {
            "id": "a1b2c3d4-0002-4e11-9a10-222222222222",
            "ref_module_id": "1f3d7b4e-9a2c-4d1e-b65a-5d2f8a9c3e71",
            "code": "HONO",
            "libelle": "Honoraires médicaux et chirurgicaux",
            "ordre": 2
        },
        {
            "id": "a1b2c3d4-0003-4e11-9a10-333333333333",
            "ref_module_id": "1f3d7b4e-9a2c-4d1e-b65a-5d2f8a9c3e71",
            "code": "CHAMBRE_PART",
            "libelle": "Chambre particulière",
            "ordre": 3
        },
        {
            "id": "a1b2c3d4-0004-4e11-9a10-444444444444",
            "ref_module_id": "1f3d7b4e-9a2c-4d1e-b65a-5d2f8a9c3e71",
            "code": "FORFAIT_JOURNALIER",
            "libelle": "Forfait journalier",
            "ordre": 4
        },
        {
            "id": "a1b2c3d4-0005-4e11-9a10-555555555555",
            "ref_module_id": "1f3d7b4e-9a2c-4d1e-b65a-5d2f8a9c3e71",
            "code": "TRANSPORT_MEDICAL",
            "libelle": "Transport médical",
            "ordre": 5
        },
        {
            "id": "d29f196d-325a-4a94-97d3-a6aa49672cfe",
            "ref_module_id": "1f3d7b4e-9a2c-4d1e-b65a-5d2f8a9c3e71",
            "code": "FORFAIT_ACTES_LOURDS",
            "libelle": "Forfait actes lourds",
            "ordre": 6
        },
        {
            "id": "01a580ae-2226-4ff9-9794-fdbe382b2327",
            "ref_module_id": "1f3d7b4e-9a2c-4d1e-b65a-5d2f8a9c3e71",
            "code": "FRAIS_DACCOMPAGNANT_DUN_ENFANT",
            "libelle": "Frais d'accompagnant d'un enfant",
            "ordre": 7
        },
        {
            "id": "b1c2d3e4-0001-4e22-8b20-111111111112",
            "ref_module_id": "2a5b8c7d-3e1f-4a9b-8c6d-0e1f2a3b4c5d",
            "code": "SOINS",
            "libelle": "Soins dentaires courants",
            "ordre": 1
        },
        {
            "id": "b1c2d3e4-0002-4e22-8b20-222222222223",
            "ref_module_id": "2a5b8c7d-3e1f-4a9b-8c6d-0e1f2a3b4c5d",
            "code": "PROTHESES",
            "libelle": "Prothèses dentaires",
            "ordre": 2
        },
        {
            "id": "b1c2d3e4-0003-4e22-8b20-333333333334",
            "ref_module_id": "2a5b8c7d-3e1f-4a9b-8c6d-0e1f2a3b4c5d",
            "code": "ORTHODONTIE",
            "libelle": "Orthodontie",
            "ordre": 3
        },
        {
            "id": "b1c2d3e4-0004-4e22-8b20-444444444445",
            "ref_module_id": "2a5b8c7d-3e1f-4a9b-8c6d-0e1f2a3b4c5d",
            "code": "PARODONTOLOGIE",
            "libelle": "Parodontologie",
            "ordre": 4
        },
        {
            "id": "c1d2e3f4-0001-4e33-7c30-111111111113",
            "ref_module_id": "3c6d9e0f-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
            "code": "VERRES",
            "libelle": "Verres correcteurs",
            "ordre": 1
        },
        {
            "id": "c1d2e3f4-0002-4e33-7c30-222222222224",
            "ref_module_id": "3c6d9e0f-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
            "code": "MONTURE",
            "libelle": "Monture",
            "ordre": 2
        },
        {
            "id": "c1d2e3f4-0003-4e33-7c30-333333333335",
            "ref_module_id": "3c6d9e0f-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
            "code": "LENTILLES",
            "libelle": "Lentilles de contact",
            "ordre": 3
        },
        {
            "id": "c1d2e3f4-0004-4e33-7c30-444444444446",
            "ref_module_id": "3c6d9e0f-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
            "code": "CHIR_REFRACTIVE",
            "libelle": "Chirurgie réfractive",
            "ordre": 4
        },
        {
            "id": "d1e2f3a4-0001-4e44-6d40-111111111114",
            "ref_module_id": "4e7f0a1b-2c3d-4e5f-9a0b-1c2d3e4f5a6b",
            "code": "MEDICAMENTS_REMBOURSABLES",
            "libelle": "Médicaments remboursables",
            "ordre": 1
        },
        {
            "id": "d1e2f3a4-0002-4e44-6d40-222222222225",
            "ref_module_id": "4e7f0a1b-2c3d-4e5f-9a0b-1c2d3e4f5a6b",
            "code": "MEDICAMENTS_NON_REMBOURSABLES",
            "libelle": "Médicaments non remboursables",
            "ordre": 2
        },
        {
            "id": "d1e2f3a4-0003-4e44-6d40-333333333336",
            "ref_module_id": "4e7f0a1b-2c3d-4e5f-9a0b-1c2d3e4f5a6b",
            "code": "VACCINS",
            "libelle": "Vaccins",
            "ordre": 3
        },
        {
            "id": "d1e2f3a4-0004-4e44-6d40-444444444447",
            "ref_module_id": "4e7f0a1b-2c3d-4e5f-9a0b-1c2d3e4f5a6b",
            "code": "PREPARATIONS",
            "libelle": "Préparations magistrales",
            "ordre": 4
        },
        {
            "id": "e1f2a3b4-0001-4e55-5e50-111111111115",
            "ref_module_id": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
            "code": "MEDECIN_GENERALISTE",
            "libelle": "Médecin généraliste",
            "ordre": 1
        },
        {
            "id": "e1f2a3b4-0002-4e55-5e50-222222222226",
            "ref_module_id": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
            "code": "SPECIALISTE",
            "libelle": "Consultations spécialiste",
            "ordre": 2
        },
        {
            "id": "e1f2a3b4-0003-4e55-5e50-333333333337",
            "ref_module_id": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
            "code": "URGENCE",
            "libelle": "Consultations d'urgence",
            "ordre": 3
        },
        {
            "id": "e1f2a3b4-0004-4e55-5e50-444444444448",
            "ref_module_id": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
            "code": "TELECONSULTATION",
            "libelle": "Téléconsultation",
            "ordre": 4
        },
        {
            "id": "f1a2b3c4-0001-4e66-4f60-111111111116",
            "ref_module_id": "6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e",
            "code": "ACCOUCHEMENT",
            "libelle": "Accouchement",
            "ordre": 1
        },
        {
            "id": "f1a2b3c4-0002-4e66-4f60-222222222227",
            "ref_module_id": "6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e",
            "code": "PRENATAL",
            "libelle": "Soins prénataux",
            "ordre": 2
        },
        {
            "id": "f1a2b3c4-0003-4e66-4f60-333333333338",
            "ref_module_id": "6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e",
            "code": "POSTPARTUM",
            "libelle": "Soins post-partum",
            "ordre": 3
        },
        {
            "id": "f1a2b3c4-0004-4e66-4f60-444444444449",
            "ref_module_id": "6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e",
            "code": "PMA",
            "libelle": "Assistance médicale à la procréation",
            "ordre": 4
        },
        {
            "id": "g1a2b3c4-0001-4e77-3a70-111111111117",
            "ref_module_id": "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
            "code": "PANSEMENTS",
            "libelle": "Pansements et soins infirmiers",
            "ordre": 1
        },
        {
            "id": "g1a2b3c4-0002-4e77-3a70-222222222228",
            "ref_module_id": "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
            "code": "INJECTIONS",
            "libelle": "Injections",
            "ordre": 2
        },
        {
            "id": "g1a2b3c4-0003-4e77-3a70-333333333339",
            "ref_module_id": "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
            "code": "PERFUSIONS",
            "libelle": "Perfusions",
            "ordre": 3
        },
        {
            "id": "h1a2b3c4-0001-4e88-2b80-111111111118",
            "ref_module_id": "8d9e0f1a-2b3c-4d5e-9f6a-7b8c9d0e1f2a",
            "code": "KINESITHERAPIE",
            "libelle": "Kinésithérapie",
            "ordre": 1
        },
        {
            "id": "h1a2b3c4-0002-4e88-2b80-222222222229",
            "ref_module_id": "8d9e0f1a-2b3c-4d5e-9f6a-7b8c9d0e1f2a",
            "code": "ORTHOPHONIE",
            "libelle": "Orthophonie",
            "ordre": 2
        },
        {
            "id": "h1a2b3c4-0003-4e88-2b80-333333333340",
            "ref_module_id": "8d9e0f1a-2b3c-4d5e-9f6a-7b8c9d0e1f2a",
            "code": "ORTHOPTIE",
            "libelle": "Orthoptie",
            "ordre": 3
        },
        {
            "id": "h1a2b3c4-0004-4e88-2b80-444444444450",
            "ref_module_id": "8d9e0f1a-2b3c-4d5e-9f6a-7b8c9d0e1f2a",
            "code": "PODOLOGIE",
            "libelle": "Podologie",
            "ordre": 4
        },
        {
            "id": "h1a2b3c4-0005-4e88-2b80-555555555560",
            "ref_module_id": "8d9e0f1a-2b3c-4d5e-9f6a-7b8c9d0e1f2a",
            "code": "ERGOTHERAPIE",
            "libelle": "Ergothérapie",
            "ordre": 5
        },
        {
            "id": "i1a2b3c4-0001-4e99-1c90-111111111119",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "code": "PROTHESES_AUDITIVES",
            "libelle": "Prothèses auditives",
            "ordre": 1
        },
        {
            "id": "i1a2b3c4-0002-4e99-1c90-222222222221",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "code": "ORTESES",
            "libelle": "Orthèses et contentions",
            "ordre": 2
        },
        {
            "id": "i1a2b3c4-0003-4e99-1c90-333333333331",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "code": "APPAREILLAGE",
            "libelle": "Appareillage médical (DME)",
            "ordre": 3
        },
        {
            "id": "i1a2b3c4-0004-4e99-1c90-444444444441",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "code": "DMI",
            "libelle": "Dispositifs médicaux implantables",
            "ordre": 4
        },
        {
            "id": "j1a2b3c4-0001-4eaa-0da0-111111111120",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "code": "BILAN_SANTE",
            "libelle": "Bilan de santé",
            "ordre": 1
        },
        {
            "id": "j1a2b3c4-0002-4eaa-0da0-222222222222",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "code": "DENTISTERIE_PREVENTIVE",
            "libelle": "Dentisterie préventive (détartrage, scellement)",
            "ordre": 2
        },
        {
            "id": "j1a2b3c4-0003-4eaa-0da0-333333333332",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "code": "SEVRAGE_TABAGIQUE",
            "libelle": "Sevrage tabagique",
            "ordre": 3
        },
        {
            "id": "j1a2b3c4-0004-4eaa-0da0-444444444442",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "code": "VACCINATION",
            "libelle": "Vaccination",
            "ordre": 4
        },
        {
            "id": "eca403c7-fd69-4eb4-b19f-03d968171458",
            "ref_module_id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "HONORAIRES_MEDICAUX",
            "libelle": "Honoraires médicaux",
            "ordre": 1
        },
        {
            "id": "f4ea2e83-7705-41f8-ab3b-edd047c0917e",
            "ref_module_id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "IMAGERIE_MEDICAL",
            "libelle": "Imagerie Médicale",
            "ordre": 2
        },
        {
            "id": "038d5c32-bf4d-4c26-ac2c-ed1c827ea2da",
            "ref_module_id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "ANALYSES_EXAMENS_LAB",
            "libelle": "Analyses d'examens et de laboratoire",
            "ordre": 3
        },
        {
            "id": "cd081014-9ded-4952-a7eb-86ac13442858",
            "ref_module_id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "HONORAIRES_PARAMEDICAUX",
            "libelle": "Honoraires paramédicaux",
            "ordre": 4
        },
        {
            "id": "d536d258-c264-4644-9767-e185eb30149c",
            "ref_module_id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "MEDICAMENTS",
            "libelle": "Médicaments",
            "ordre": 5
        },
        {
            "id": "dc5f600a-c704-4d01-94c5-e470882aff03",
            "ref_module_id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "HOMEOPATHIE_PRESCRITE_NON_REMBOURSE_SS",
            "libelle": "Homéopathie prescrite non remboursée par la Sécurité sociale",
            "ordre": 6
        },
        {
            "id": "92fa1115-5b00-44bc-8748-2543ace54f36",
            "ref_module_id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "MATERIEL_MEDICAL",
            "libelle": "Matériel médical",
            "ordre": 7
        },
        {
            "id": "4dbcb1cb-a041-4702-bd7d-92bf6ce9db08",
            "ref_module_id": "15ada47f-4f2b-4aa5-bd8e-fbf6ba1f4ea8",
            "code": "TRANSPORT",
            "libelle": "Transport",
            "ordre": 8
        },

        {
            "id": "f0f75568-891a-400b-b647-f832e885adc2",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "code": "CAPITAL_ANY_SIT_FAMILLY",
            "libelle": "Capital quelle que soit la situation de famille",
            "ordre": 1,
        },

        {
            "id": "b27e11c7-9c0d-4e3b-9c33-b93d36ce8b01",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "code": "CAPITAL_SITUATION_FAMILLE",
            "libelle": "Capital en fonction de la situation de famille",
            "ordre": 2,
        },

        {
            "id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "code": "CAPITAL_RENTE",
            "libelle": "Capital + rente",
            "ordre": 3,
        },
    ],
    ref_acts_v1: [
        {
            "id": "ac111111-0001-4aaa-8a10-000000000001",
            "ref_categorie_id": "b1c2d3e4-0001-4e22-8b20-111111111112",
            "code": "DENT_DETARTRAGE",
            "libelle": "Détartrage dentaire",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ac111111-0002-4aaa-8a10-000000000002",
            "ref_categorie_id": "b1c2d3e4-0001-4e22-8b20-111111111112",
            "code": "DENT_CONSULT",
            "libelle": "Consultation dentaire",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "ac111111-0003-4aaa-8a10-000000000003",
            "ref_categorie_id": "b1c2d3e4-0001-4e22-8b20-111111111112",
            "code": "DENT_RADIO_PANO",
            "libelle": "Radiographie panoramique",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },
        {
            "id": "ac111111-0004-4aaa-8a10-000000000004",
            "ref_categorie_id": "b1c2d3e4-0001-4e22-8b20-111111111112",
            "code": "DENT_SOINS_CARIE",
            "libelle": "Soins de carie (obturations)",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 4
        },

        {
            "id": "ac222222-0001-4bbb-8b20-000000000001",
            "ref_categorie_id": "b1c2d3e4-0002-4e22-8b20-222222222223",
            "code": "PROTHESE_CM",
            "libelle": "Couronne céramo‑métal",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ac222222-0002-4bbb-8b20-000000000002",
            "ref_categorie_id": "b1c2d3e4-0002-4e22-8b20-222222222223",
            "code": "PROTHESE_CERAM_FULL",
            "libelle": "Couronne tout céramique",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "ac222222-0003-4bbb-8b20-000000000003",
            "ref_categorie_id": "b1c2d3e4-0002-4e22-8b20-222222222223",
            "code": "PROTHESE_BRIDGE_3E",
            "libelle": "Bridge 3 éléments",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },
        {
            "id": "ac222222-0004-4bbb-8b20-000000000004",
            "ref_categorie_id": "b1c2d3e4-0002-4e22-8b20-222222222223",
            "code": "PROTHESE_INLAY_CORE",
            "libelle": "Inlay‑core",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 4
        },

        {
            "id": "ac333333-0001-4ccc-8c30-000000000001",
            "ref_categorie_id": "b1c2d3e4-0003-4e22-8b20-333333333334",
            "code": "ORTHO_BAGUE_METAL",
            "libelle": "Orthodontie bagues métalliques",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ac333333-0002-4ccc-8c30-000000000002",
            "ref_categorie_id": "b1c2d3e4-0003-4e22-8b20-333333333334",
            "code": "ORTHO_BAGUE_CERAM",
            "libelle": "Orthodontie bagues céramiques",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "ac333333-0003-4ccc-8c30-000000000003",
            "ref_categorie_id": "b1c2d3e4-0003-4e22-8b20-333333333334",
            "code": "ORTHO_ALIGNEURS",
            "libelle": "Aligneurs transparents",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },
        {
            "id": "ac333333-0004-4ccc-8c30-000000000004",
            "ref_categorie_id": "b1c2d3e4-0003-4e22-8b20-333333333334",
            "code": "ORTHO_CONTENTION",
            "libelle": "Contention orthodontique",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 4
        },

        {
            "id": "ac444444-0001-4ddd-8d40-000000000001",
            "ref_categorie_id": "b1c2d3e4-0004-4e22-8b20-444444444445",
            "code": "PARO_DETARTRAGE_SOUS",
            "libelle": "Détartrage sous‑gingival",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ac444444-0002-4ddd-8d40-000000000002",
            "ref_categorie_id": "b1c2d3e4-0004-4e22-8b20-444444444445",
            "code": "PARO_SURFACAGE",
            "libelle": "Surfaçage radiculaire",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "ac444444-0003-4ddd-8d40-000000000003",
            "ref_categorie_id": "b1c2d3e4-0004-4e22-8b20-444444444445",
            "code": "PARO_BILAN",
            "libelle": "Bilan parodontal",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },

        {
            "id": "op111111-0001-4aaa-9a10-000000000001",
            "ref_categorie_id": "c1d2e3f4-0001-4e33-7c30-111111111113",
            "code": "VERRE_SIMPLE",
            "libelle": "Verre simple foyer (correction simple)",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "op111111-0002-4aaa-9a10-000000000002",
            "ref_categorie_id": "c1d2e3f4-0001-4e33-7c30-111111111113",
            "code": "VERRE_COMPLEXE",
            "libelle": "Verre correction complexe",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "op111111-0003-4aaa-9a10-000000000003",
            "ref_categorie_id": "c1d2e3f4-0001-4e33-7c30-111111111113",
            "code": "VERRE_PROGRESSIF",
            "libelle": "Verre progressif",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },

        {
            "id": "op222222-0001-4bbb-9b20-000000000001",
            "ref_categorie_id": "c1d2e3f4-0002-4e33-7c30-222222222224",
            "code": "MONTURE_ADULTE",
            "libelle": "Monture adulte",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "op222222-0002-4bbb-9b20-000000000002",
            "ref_categorie_id": "c1d2e3f4-0002-4e33-7c30-222222222224",
            "code": "MONTURE_ENFANT",
            "libelle": "Monture enfant",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },

        {
            "id": "op333333-0001-4ccc-9c30-000000000001",
            "ref_categorie_id": "c1d2e3f4-0003-4e33-7c30-333333333335",
            "code": "LENTILLE_JOURNALIERE",
            "libelle": "Lentilles journalières",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "op333333-0002-4ccc-9c30-000000000002",
            "ref_categorie_id": "c1d2e3f4-0003-4e33-7c30-333333333335",
            "code": "LENTILLE_MENSUELLE",
            "libelle": "Lentilles mensuelles",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "op333333-0003-4ccc-9c30-000000000003",
            "ref_categorie_id": "c1d2e3f4-0003-4e33-7c30-333333333335",
            "code": "LENTILLE_RGP",
            "libelle": "Lentilles rigides (RGP)",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },

        {
            "id": "op444444-0001-4ddd-9d40-000000000001",
            "ref_categorie_id": "c1d2e3f4-0004-4e33-7c30-444444444446",
            "code": "CHIR_LASIK",
            "libelle": "Chirurgie réfractive LASIK",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "op444444-0002-4ddd-9d40-000000000002",
            "ref_categorie_id": "c1d2e3f4-0004-4e33-7c30-444444444446",
            "code": "CHIR_PRK",
            "libelle": "Chirurgie réfractive PRK",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },

        {
            "id": "ho111111-0001-4aaa-7a10-000000000001",
            "ref_categorie_id": "a1b2c3d4-0001-4e11-9a10-111111111111",
            "code": "HOSP_FRAIS_SEJOUR_BASE",
            "libelle": "Frais de séjour – base",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ho222222-0001-4bbb-7b20-000000000001",
            "ref_categorie_id": "a1b2c3d4-0002-4e11-9a10-222222222222",
            "code": "HOSP_HONO_CHIR",
            "libelle": "Honoraires chirurgicaux",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ho222222-0002-4bbb-7b20-000000000002",
            "ref_categorie_id": "a1b2c3d4-0002-4e11-9a10-222222222222",
            "code": "HOSP_HONO_ANESTH",
            "libelle": "Honoraires d'anesthésie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "ho333333-0001-4ccc-7c30-000000000001",
            "ref_categorie_id": "a1b2c3d4-0003-4e11-9a10-333333333333",
            "code": "HOSP_CHAMBRE_PART_JOUR",
            "libelle": "Chambre particulière (par jour)",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ho444444-0001-4ddd-7d40-000000000001",
            "ref_categorie_id": "a1b2c3d4-0004-4e11-9a10-444444444444",
            "code": "HOSP_FORFAIT_JOURNALIER",
            "libelle": "Forfait journalier (par jour)",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 1
        },
        {
            "id": "ho555555-0001-4eee-7e50-000000000001",
            "ref_categorie_id": "a1b2c3d4-0005-4e11-9a10-555555555555",
            "code": "HOSP_TRANSPORT_VSL",
            "libelle": "Transport VSL",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ho555555-0002-4eee-7e50-000000000002",
            "ref_categorie_id": "a1b2c3d4-0005-4e11-9a10-555555555555",
            "code": "HOSP_TRANSPORT_AMBULANCE",
            "libelle": "Transport ambulance",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },

        {
            "id": "ph111111-0001-4aaa-6a10-000000000001",
            "ref_categorie_id": "d1e2f3a4-0001-4e44-6d40-111111111114",
            "code": "PHARMA_REMBOURSABLE",
            "libelle": "Médicament remboursable",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ph222222-0001-4bbb-6b20-000000000001",
            "ref_categorie_id": "d1e2f3a4-0002-4e44-6d40-222222222225",
            "code": "PHARMA_NON_REMBOURSABLE",
            "libelle": "Médicament non remboursable",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ph333333-0001-4ccc-6c30-000000000001",
            "ref_categorie_id": "d1e2f3a4-0003-4e44-6d40-333333333336",
            "code": "VACCIN_GRIPPE",
            "libelle": "Vaccin grippe saisonnière",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ph333333-0002-4ccc-6c30-000000000002",
            "ref_categorie_id": "d1e2f3a4-0003-4e44-6d40-333333333336",
            "code": "VACCIN_HEP_B",
            "libelle": "Vaccin hépatite B",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "ph444444-0001-4ddd-6d40-000000000001",
            "ref_categorie_id": "d1e2f3a4-0004-4e44-6d40-444444444447",
            "code": "PREPARATION_MAGISTRALE",
            "libelle": "Préparation magistrale",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },

        {
            "id": "co111111-0001-4aaa-5a10-000000000001",
            "ref_categorie_id": "e1f2a3b4-0001-4e55-5e50-111111111115",
            "code": "CONS_MED_GEN",
            "libelle": "Consultation médecin généraliste",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "co222222-0001-4bbb-5b20-000000000001",
            "ref_categorie_id": "e1f2a3b4-0002-4e55-5e50-222222222226",
            "code": "CONS_CARDIO",
            "libelle": "Consultation cardiologie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "co222222-0002-4bbb-5b20-000000000002",
            "ref_categorie_id": "e1f2a3b4-0002-4e55-5e50-222222222226",
            "code": "CONS_DERMA",
            "libelle": "Consultation dermatologie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "co222222-0003-4bbb-5b20-000000000003",
            "ref_categorie_id": "e1f2a3b4-0002-4e55-5e50-222222222226",
            "code": "CONS_GYNECO",
            "libelle": "Consultation gynécologie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },
        {
            "id": "co333333-0001-4ccc-5c30-000000000001",
            "ref_categorie_id": "e1f2a3b4-0003-4e55-5e50-333333333337",
            "code": "CONS_URGENCE",
            "libelle": "Consultation d'urgence",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "co444444-0001-4ddd-5d40-000000000001",
            "ref_categorie_id": "e1f2a3b4-0004-4e55-5e50-444444444448",
            "code": "CONS_TELECONSULT",
            "libelle": "Téléconsultation",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },

        {
            "id": "ma111111-0001-4aaa-4a10-000000000001",
            "ref_categorie_id": "f1a2b3c4-0001-4e66-4f60-111111111116",
            "code": "MAT_VOIE_BASSE",
            "libelle": "Accouchement par voie basse",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ma111111-0002-4aaa-4a10-000000000002",
            "ref_categorie_id": "f1a2b3c4-0001-4e66-4f60-111111111116",
            "code": "MAT_CESARIENNE",
            "libelle": "Accouchement par césarienne",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "ma222222-0001-4bbb-4b20-000000000001",
            "ref_categorie_id": "f1a2b3c4-0002-4e66-4f60-222222222227",
            "code": "MAT_ECHO_T1",
            "libelle": "Échographie T1",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ma222222-0002-4bbb-4b20-000000000002",
            "ref_categorie_id": "f1a2b3c4-0002-4e66-4f60-222222222227",
            "code": "MAT_ECHO_T2",
            "libelle": "Échographie T2",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "ma222222-0003-4bbb-4b20-000000000003",
            "ref_categorie_id": "f1a2b3c4-0002-4e66-4f60-222222222227",
            "code": "MAT_ECHO_T3",
            "libelle": "Échographie T3",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },
        {
            "id": "ma333333-0001-4ccc-4c30-000000000001",
            "ref_categorie_id": "f1a2b3c4-0003-4e66-4f60-333333333338",
            "code": "MAT_SUIVI_POSTPARTUM",
            "libelle": "Suivi post‑partum",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ma444444-0001-4ddd-4d40-000000000001",
            "ref_categorie_id": "f1a2b3c4-0004-4e66-4f60-444444444449",
            "code": "PMA_FIV_ICSI",
            "libelle": "PMA – FIV/ICSI",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "ma444444-0002-4ddd-4d40-000000000002",
            "ref_categorie_id": "f1a2b3c4-0004-4e66-4f60-444444444449",
            "code": "PMA_INSEMINATION",
            "libelle": "PMA – Insémination intra‑utérine",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },

        {
            "id": "in111111-0001-4aaa-3a10-000000000001",
            "ref_categorie_id": "g1a2b3c4-0001-4e77-3a70-111111111117",
            "code": "INF_PANSEMENT_SIMPLE",
            "libelle": "Pansement simple",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "in111111-0002-4aaa-3a10-000000000002",
            "ref_categorie_id": "g1a2b3c4-0001-4e77-3a70-111111111117",
            "code": "INF_PANSEMENT_COMPLEXE",
            "libelle": "Pansement complexe",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "in222222-0001-4bbb-3b20-000000000001",
            "ref_categorie_id": "g1a2b3c4-0002-4e77-3a70-222222222228",
            "code": "INF_INJECTION_SC",
            "libelle": "Injection sous‑cutanée",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "in222222-0002-4bbb-3b20-000000000002",
            "ref_categorie_id": "g1a2b3c4-0002-4e77-3a70-222222222228",
            "code": "INF_INJECTION_IM",
            "libelle": "Injection intra‑musculaire",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "in333333-0001-4ccc-3c30-000000000001",
            "ref_categorie_id": "g1a2b3c4-0003-4e77-3a70-333333333339",
            "code": "INF_PERFUSION_DOM",
            "libelle": "Perfusion à domicile",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },

        {
            "id": "au111111-0001-4aaa-2a10-000000000001",
            "ref_categorie_id": "h1a2b3c4-0001-4e88-2b80-111111111118",
            "code": "AUX_KINE_SEANCE",
            "libelle": "Séance de kinésithérapie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "au222222-0001-4bbb-2b20-000000000001",
            "ref_categorie_id": "h1a2b3c4-0002-4e88-2b80-222222222229",
            "code": "AUX_ORTHOPHONIE_SEANCE",
            "libelle": "Séance d'orthophonie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "au333333-0001-4ccc-2c30-000000000001",
            "ref_categorie_id": "h1a2b3c4-0003-4e88-2b80-333333333340",
            "code": "AUX_ORTHOPTIE_SEANCE",
            "libelle": "Séance d'orthoptie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "au444444-0001-4ddd-2d40-000000000001",
            "ref_categorie_id": "h1a2b3c4-0004-4e88-2b80-444444444450",
            "code": "AUX_PODOLOGIE_SEANCE",
            "libelle": "Séance de podologie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "au555555-0001-4eee-2e50-000000000001",
            "ref_categorie_id": "h1a2b3c4-0005-4e88-2b80-555555555560",
            "code": "AUX_ERGO_SEANCE",
            "libelle": "Séance d'ergothérapie",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },

        {
            "id": "eq111111-0001-4aaa-1a10-000000000001",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "ref_categorie_id": "i1a2b3c4-0001-4e99-1c90-111111111119",
            "code": "EQP_PROTHESE_AUDITIVE",
            "libelle": "Prothèse auditive",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1,
            "risque": "sante"
        },
        {
            "id": "eq222222-0001-4bbb-1b20-000000000001",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "ref_categorie_id": "i1a2b3c4-0002-4e99-1c90-222222222221",
            "code": "EQP_ORTHESE_GENOU",
            "libelle": "Orthèse de genou",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1,
            "risque": "sante"
        },
        {
            "id": "eq333333-0001-4ccc-1c30-000000000001",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "ref_categorie_id": "i1a2b3c4-0003-4e99-1c90-333333333331",
            "code": "EQP_CHAISE_ROULANTE",
            "libelle": "Chaise roulante",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1,
            "risque": "sante"
        },
        {
            "id": "eq333333-0002-4ccc-1c30-000000000002",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "ref_categorie_id": "i1a2b3c4-0003-4e99-1c90-333333333331",
            "code": "EQP_LIT_MEDICALISE",
            "libelle": "Lit médicalisé",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2,
            "risque": "sante"
        },
        {
            "id": "eq444444-0001-4ddd-1d40-000000000001",
            "ref_module_id": "9e0f1a2b-3c4d-5e6f-8a7b-9c0d1e2f3a4b",
            "ref_categorie_id": "i1a2b3c4-0004-4e99-1c90-444444444441",
            "code": "EQP_STENT_CORONAIRE",
            "libelle": "Stent coronaire (DMI)",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1,
            "risque": "sante"
        },

        {
            "id": "pr111111-0001-4aaa-0a10-000000000001",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "ref_categorie_id": "j1a2b3c4-0001-4eaa-0da0-111111111120",
            "code": "PREV_BILAN_ANNUEL",
            "libelle": "Bilan de santé annuel",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1,
            "risque": "sante"
        },
        {
            "id": "pr222222-0001-4bbb-0b20-000000000001",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "ref_categorie_id": "j1a2b3c4-0002-4eaa-0da0-222222222222",
            "code": "PREV_DETARTRAGE",
            "libelle": "Détartrage préventif",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1,
            "risque": "sante"
        },
        {
            "id": "pr222222-0002-4bbb-0b20-000000000002",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "ref_categorie_id": "j1a2b3c4-0002-4eaa-0da0-222222222222",
            "code": "PREV_SCELLEMENT_SILLONS",
            "libelle": "Scellement des sillons",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2,
            "risque": "sante"
        },
        {
            "id": "pr333333-0001-4ccc-0c30-000000000001",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "ref_categorie_id": "j1a2b3c4-0003-4eaa-0da0-333333333332",
            "code": "PREV_SEVRAGE_TABAGIQUE",
            "libelle": "Programme de sevrage tabagique",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1,
            "risque": "sante"
        },
        {
            "id": "pr444444-0001-4ddd-0d40-000000000001",
            "ref_module_id": "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "ref_categorie_id": "j1a2b3c4-0004-4eaa-0da0-444444444442",
            "code": "PREV_VACC_TETANOS",
            "libelle": "Vaccination tétanos",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1,
            "risque": "sante"
        },




        {
            "id": "2dae3c92-01ec-4732-865f-34f2bef3384e",
            "ref_categorie_id": "eca403c7-fd69-4eb4-b19f-03d968171458",
            "code": "CONSULT_MED_DPTAM",
            "libelle": "Consultation ou visite d'un médecin adhérant à l'un des DPTAM",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "3f19fe24-0df2-426e-b5fb-55d5c5a9024a",
            "ref_categorie_id": "eca403c7-fd69-4eb4-b19f-03d968171458",
            "code": "CONSULT_MED_NON_DPTAM",
            "libelle": "Consultation ou visite d'un médecin non adhérant à l'un des DPTAM",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },
        {
            "id": "1228fc77-206a-4d6f-bf1c-36fe37804acb",
            "ref_categorie_id": "eca403c7-fd69-4eb4-b19f-03d968171458",
            "code": "SEANCE_ACC_PSY",
            "libelle": "Séances d'accompagnement psychologique réalisées par un psychologue et prises en charge par la Sécurité sociale",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 3
        },
        {
            "id": "6af6b854-818e-479a-98a4-5e8143fc6ebb",
            "ref_categorie_id": "eca403c7-fd69-4eb4-b19f-03d968171458",
            "code": "ACTES_TECHNIQUE_DPTAM",
            "libelle": "Actes techniques médicaux et actes de chirurgie pratiqués par un médecin adhérant à l'un des DPTAM",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 4
        },
        {
            "id": "c6dcbe23-8ec3-4cbd-9ee0-1e9df335b69f",
            "ref_categorie_id": "eca403c7-fd69-4eb4-b19f-03d968171458",
            "code": "ACTES_TECHNIQUE_NON_DPTAM",
            "libelle": "Actes techniques médicaux et actes de chirurgie pratiqués par un médecin non adhérant à l'un des DPTAM",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 5
        },


        {
            "id": "84108dba-fe1d-409c-a5c3-039b993957a5",
            "ref_categorie_id": "f4ea2e83-7705-41f8-ab3b-edd047c0917e",
            "code": "ACTES_IMAGERIE_DPTAM",
            "libelle": "Actes d’imagerie, échographie et doppler de médecins adhérents à l’un des DPTAM",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "1e5ec871-5ce3-491f-a6f3-3f8d48917ab1",
            "ref_categorie_id": "f4ea2e83-7705-41f8-ab3b-edd047c0917e",
            "code": "ACTES_IMAGERIE_NON_DPTAM",
            "libelle": "Actes d’imagerie, échographie et doppler de médecins non adhérents à l’un des DPTAM",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },



        {
            "id": "26583b01-2d03-4532-a43e-3bd773e4cd69",
            "ref_categorie_id": "038d5c32-bf4d-4c26-ac2c-ed1c827ea2da",
            "code": "SS_PRIS_EN_CHARGE",
            "libelle": "Pris en charge par la sécurité sociale",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },

        {
            "id": "f66d204a-48bb-43db-b008-b926b133652b",
            "ref_categorie_id": "cd081014-9ded-4952-a7eb-86ac13442858",
            "code": "ACTES_PRATIQUES_PAR_AUX_MEDICAUX",
            "libelle": "Actes pratiqués par les auxiliaires médicaux : les infirmiers, les masseurs kinésithérapeutes, les orthophonistes, les\n" +
                "orthoptistes et les pédicures-podologues",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },


        {
            "id": "445c9a44-93d6-4f8f-b412-0d3ba0a38d02",
            "ref_categorie_id": "d536d258-c264-4644-9767-e185eb30149c",
            "code": "MEDICAMENTS_PRIS_EN_CHARGE_SS_65_30_15",
            "libelle": "Médicament pris en charge par la Sécurité sociale à 65%, 30% et 15%",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },
        {
            "id": "128b1c8d-e6dd-4169-99a2-d4ebbbbeb20e",
            "ref_categorie_id": "d536d258-c264-4644-9767-e185eb30149c",
            "code": "VACCINS_NON_PRIS_EN_CHARGE",
            "libelle": "Vaccins non pris en charge par la Sécurité sociale et prescrits par un médecin dans les conditions prévues par leur\n" +
                "autorisation de mise sur le marché",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 2
        },


        {
            "id": "128b1c8d-e6dd-4169-99a2-d4ebbbbeb20e",
            "ref_categorie_id": "dc5f600a-c704-4d01-94c5-e470882aff03",
            "code": "MEDICAMENTS_HOMEOPHATIQUES",
            "libelle": "Médicaments homéopathiques prescrits par un médecin (limite annuelle par bénéficiaire)",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },

        {
            "id": "f42d9bab-3dfb-4f42-9ddb-548ef4162e7d",
            "ref_categorie_id": "4dbcb1cb-a041-4702-bd7d-92bf6ce9db08",
            "code": "FRAIS_TRANSPORT_SS",
            "libelle": "Frais de transport (remboursés par la Sécurité sociale)",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },

        {
            "id": "86a5fb0d-e2c8-49f5-bfc7-5657d8a62004",
            "ref_categorie_id": "92fa1115-5b00-44bc-8748-2543ace54f36",
            "code": "APPAREILLAGE_PROTHESE_PRODUITS_PRESTATIONS",
            "libelle": "Appareillages, prothèses, produits et prestations, non pris en charge au titre des postes prothèses dentaires, auditives et\n" +
                "optiques",
            "libelle_long": "",
            "allow_surco": true,
            "ordre": 1
        },


        {
            "id": "c53eed4e-e7db-48e4-8b2d-0b5d4a597837",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "f0f75568-891a-400b-b647-f832e885adc2",
            "code": "CAPITAL_ANY_SIT_FAMILLY",
            "libelle": "Capital quelle que soit la situation de famille",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 1,
            "risque": "prevoyance"
        },




        {
            "id": "18092797-ef52-4989-9833-2d8c9dd7ce9b",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "b27e11c7-9c0d-4e3b-9c33-b93d36ce8b01",
            "code": "CELIB_VEUF_DIVORCE_POURC_SALAIRE_REF",
            "libelle": "Célibataire, veuf, divorcé sans enfant, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 5,
            "risque": "prevoyance"
        },
        {
            "id": "a8839373-b765-4fec-bc57-7d776304f715",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "b27e11c7-9c0d-4e3b-9c33-b93d36ce8b01",
            "code": "MARIE_CVDS_POURC_SALAIRE_REF",
            "libelle": "Marié sans enfant ou CVDS avec personne à charge, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 6,
            "risque": "prevoyance"
        },
        {
            "id": "d518b519-2e49-47b1-a526-15578212a59a",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "b27e11c7-9c0d-4e3b-9c33-b93d36ce8b01",
            "code": "MAJO_ENFANT_POURC_SALAIRE_REF",
            "libelle": "Majoration par enfant ou personne à charge supplémentaire, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 7,
            "risque": "prevoyance"
        },


        {
            "id": "37739182-eab8-4416-87ec-84df38dff1ca",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "code": "CELIB_VEUF_DIVORCE_POURC_SALAIRE_REF",
            "libelle": "Célibataire, veuf, divorcé, séparé sans enfant, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 8,
            "risque": "prevoyance"
        },

        {
            "id": "6e8401ab-c49a-4d26-88b3-800942d3919f",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "code": "Marié, concubin, pacsé sans enfant ou CVDS avec personne à charge_POURC_SALAIRE_REF",
            "libelle": "Marié, concubin, pacsé sans enfant ou CVDS avec personne à charge, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 9,
            "risque": "prevoyance"
        },

        {
            "id": "3ae410b6-d991-4509-a0d7-ad387b04263a",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "code": "Majoration par personne à charge supplémentaire_POURC_SALAIRE_REF",
            "libelle": "Majoration par personne à charge supplémentaire, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 10,
            "risque": "prevoyance"
        },

        {
            "id": "a8431dc9-da62-4b5b-af1b-9108bef00dea",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "code": "Capital uniforme_POURC_SALAIRE_REF",
            "libelle": "Capital uniforme, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 11,
            "risque": "prevoyance"
        },

        {
            "id": "9495f2dd-ce0e-4b45-9c0d-a83bbf649a55",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "code": "Rente éducation jusqu'à 10 ans_POURC_SALAIRE_REF",
            "libelle": "Rente éducation jusqu'à 10 ans, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 12,
            "risque": "prevoyance"
        },

        {
            "id": "f23cf085-0f67-41bd-b874-f2476e0d798d",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "code": "Rente éducation de 11 à 18 ans_POURC_SALAIRE_REF",
            "libelle": "Rente éducation de 11 à 18 ans, pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 13,
            "risque": "prevoyance"
        },

        {
            "id": "a9d8832e-c4a0-4857-b398-549e06be0ef9",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "code": "Rente éducation de 19 à 26 ans (sous conditions)_POURC_SALAIRE_REF",
            "libelle": "Rente éducation de 19 à 26 ans (sous conditions), pourcentage du salaire de référence",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 14,
            "risque": "prevoyance"
        },


        {
            "id": "14ac6409-a67a-4015-91f2-00efde375561",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "__ungrouped__:9602b034-5824-4923-8595-2c2f763eed36",
            "code": "PTIA",
            "libelle": "PTIA - versement par anticipation du décès toutes causes",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 15,
            "risque": "prevoyance"
        },
        {
            "id": "351c4e3d-1524-4fa3-bcff-9a34303db302",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "__ungrouped__:9602b034-5824-4923-8595-2c2f763eed36",
            "code": "DECES_ACCIDENT_AVC",
            "libelle": "Décès accidentel y compris en cas d’AVC",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 16,
            "risque": "prevoyance"
        },
        {
            "id": "e10cde41-2565-4d8f-8617-a7b8bd8e5525",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "ref_categorie_id": "__ungrouped__:9602b034-5824-4923-8595-2c2f763eed36",
            "code": "DOUBLE_EFFET",
            "libelle": "Double effet",
            "libelle_long": "",
            "allow_surco": false,
            "ordre": 17,
            "risque": "prevoyance"
        },

    ],
    ref_cat_personnel_v1: [
        { id: "cat-non-cadres", code: "NON_CADRES", libelle: "Non cadres", ordre: 1, is_enabled: true },
        { id: "cat-cadres",      code: "CADRES",      libelle: "Cadres",     ordre: 2, is_enabled: true },
        { id: "cat-edp",         code: "EDP",         libelle: "EDP",        ordre: 3, is_enabled: true },
    ],
    ref_tranches_ages_v1: [
        { id: "age-40m",  code: "<=40", libelle: "40 et moins", ordre: 1, is_enabled: true },
        { id: "age-41-45",code: "41-45", libelle: "41 - 45",    ordre: 2, is_enabled: true },
        { id: "age-46-50",code: "46-50", libelle: "46 - 50",    ordre: 3, is_enabled: true },
        { id: "age-51p",  code: ">=51",  libelle: "51 +",       ordre: 4, is_enabled: true },
    ],
    ref_regimes_v1: [
        { id: "reg-base",        code: "BASE",         libelle: "Base",            ordre: 1, is_enabled: true },
        { id: "reg-province",    code: "PROVINCE",     libelle: "Province",        ordre: 2, is_enabled: true },
        { id: "reg-als-moselle", code: "ALS_MOSELLE",  libelle: "Alsace-Moselle",  ordre: 3, is_enabled: true },
    ],
    // --- types de valeur (référentiel UI/stockage) ---
    ref_value_types_v1: [
        {
            "id": "percent_base",
            "code": "%BASE",
            "libelle": "Pourcentage sur base (BR/TM)",
            "fields": [
                {
                    "name": "base",
                    "kind": "enum",
                    "required": true,
                    "options": [
                        {
                            "id": "br",
                            "label": "BR"
                        },
                        {
                            "id": "br-mr",
                            "label": "BR-MR"
                        },
                        {
                            "id": "Forfait",
                            "label": "FORFAIT"
                        },
                        {
                            "id": "tm",
                            "label": "TM"
                        },
                        {
                            "id": "pmss",
                            "label": "PMSS"
                        },
                        {
                            "id": "salaire_ref",
                            "label": "Salaire de référence"
                        },
                        {
                            "id": "capital_dc",
                            "label": "Capital décès"
                        }
                    ]
                },
                {
                    "name": "taux",
                    "kind": "number",
                    "required": true,
                    "min": 0,
                    "max": 1000,
                    "step": 1,
                    "default": 100,
                    "suffix": "%"
                },
                {
                    "name": "plafond_montant",
                    "kind": "number",
                    "required": false,
                    "min": 0,
                    "step": 1,
                    "suffix": "€"
                },
                {
                    "name": "periodicite",
                    "kind": "enum",
                    "required": false,
                    "options": [
                        {
                            "id": "par_acte",
                            "label": "par acte"
                        },
                        {
                            "id": "par_an",
                            "label": "par an"
                        },
                        {
                            "id": "par_an_par_beneficiaire",
                            "label": "par an/bénéficiaire"
                        }
                    ]
                }
            ]
        },
        {
            "id": "forfait",
            "code": "FORFAIT",
            "libelle": "Montant forfaitaire",
            "fields": [
                {
                    "name": "montant",
                    "kind": "number",
                    "required": true,
                    "min": 0,
                    "step": 1,
                    "suffix": "€"
                },
                {
                    "name": "periodicite",
                    "kind": "enum",
                    "required": true,
                    "options": [
                        {
                            "id": "par_acte",
                            "label": "par acte"
                        },
                        {
                            "id": "par_an",
                            "label": "par an"
                        },
                        {
                            "id": "par_an_par_beneficiaire",
                            "label": "par an/bénéficiaire"
                        },
                        {
                            "id": "par_jour",
                            "label": "par jour"
                        }
                    ]
                },
                {
                    "name": "plafond_montant",
                    "kind": "number",
                    "required": false,
                    "min": 0,
                    "step": 1,
                    "suffix": "€"
                }
            ]
        },
        {
            "id": "free_text",
            "code": "LIBRE",
            "libelle": "Texte libre",
            "fields": [
                {
                    "name": "label",
                    "kind": "text",
                    "required": true,
                    "placeholder": "ex: 200% TM, 300% BR, Forfait 160 €/an..."
                }
            ]
        },
        {
            "id": "percent_salary_reference_select",
            "code": "%REF_LIST",
            "libelle": "Pourcentage du salaire de référence (liste)",
            "fields": [
                {
                    "name": "percent",
                    "kind": "enum",
                    "required": true,
                    "label": "Pourcentage",
                    "options": [
                        {"id": "100%", "label": "100 %"},
                        {"id": "125%", "label": "125 %"},
                        {"id": "150%", "label": "150 %"},
                        {"id": "175%", "label": "175 %"},
                        {"id": "200%", "label": "200 %"},
                        {"id": "250%", "label": "250 %"}
                    ]
                }
            ]
        },
        {
            "id": "percent_salary_reference_input",
            "code": "%REF_IN",
            "libelle": "Pourcentage du salaire de référence (saisie)",
            "fields": [
                {
                    "name": "percent",
                    "kind": "number",
                    "required": true,
                    "label": "Pourcentage",
                    "min": 0,
                    "max": 500,
                    "step": 1,
                    "default": 100,
                    "suffix": "%"
                }
            ]
        },
        {
            "id": "percent_salary_brut_input",
            "code": "%BRUT",
            "libelle": "Pourcentage du salaire brut",
            "fields": [
                {
                    "name": "percent",
                    "kind": "number",
                    "required": true,
                    "label": "Pourcentage",
                    "min": 0,
                    "max": 100,
                    "step": 1,
                    "default": 80,
                    "suffix": "%"
                }
            ]
        },
        {
            "id": "percent_salary_net_input",
            "code": "%NET",
            "libelle": "Pourcentage du salaire net",
            "fields": [
                {
                    "name": "percent",
                    "kind": "number",
                    "required": true,
                    "label": "Pourcentage",
                    "min": 0,
                    "max": 100,
                    "step": 1,
                    "default": 60,
                    "suffix": "%"
                }
            ]
        },
        {
            "id": "franchise_days",
            "code": "FRANCHISE",
            "libelle": "Franchise (jours)",
            "fields": [
                {
                    "name": "days",
                    "kind": "number",
                    "required": true,
                    "label": "Nombre de jours",
                    "min": 0,
                    "max": 365,
                    "step": 1,
                    "suffix": "j"
                },
                {
                    "name": "type",
                    "kind": "enum",
                    "required": false,
                    "label": "Type de franchise",
                    "options": [
                        {"id": "standard", "label": "Standard"},
                        {"id": "ecourtee", "label": "Écourtée (hospitalisation + 3 j)"}
                    ]
                }
            ]
        },
        {
            "id": "amount_euros",
            "code": "MONTANT",
            "libelle": "Montant en euros",
            "fields": [
                {
                    "name": "amount",
                    "kind": "number",
                    "required": true,
                    "label": "Montant",
                    "min": 0,
                    "step": 1,
                    "suffix": "€"
                }
            ]
        }
    ],
    prevoyance_catalogue_templates: [
        {
            id: "prev-deces-capital",
            libelle: "Décès en capital",
            acts: [
                {
                    id: "act-prev-deces-flat",
                    label: "Capital quel que soit la situation de famille",
                    description: "Pourcentage unique du salaire de référence",
                    field_type: "radio",
                    sub_items: [
                        {
                            id: "sub-prev-deces-flat-principal",
                            libelle: "Montant principal",
                            description: "Valeur principale délivrée côté client",
                            field_type: "radio",
                            value_type_id: "percent_salary_reference_select",
                            min_hint: "≥ 100 %",
                            max_hint: "≤ 250 %"
                        },
                        {
                            id: "sub-prev-deces-flat-ptia",
                            libelle: "PTIA (toutes causes)",
                            description: "Activation de l’option PTIA",
                            field_type: "checkbox",
                            value_type_id: "free_text"
                        },
                        {
                            id: "sub-prev-deces-flat-accident",
                            libelle: "Décès accidentel / AVC",
                            description: "Capital supplémentaire 100 %",
                            field_type: "checkbox",
                            value_type_id: "free_text"
                        },
                        {
                            id: "sub-prev-deces-flat-double-effet",
                            libelle: "Double effet",
                            description: "100 % supplémentaire en cas de double effet",
                            field_type: "checkbox",
                            value_type_id: "free_text"
                        }
                    ]
                },
                {
                    id: "act-prev-deces-family",
                    label: "Capital en fonction de la situation familiale",
                    description: "Pourcentages variables selon la situation",
                    field_type: "radio",
                    sub_items: [
                        {
                            id: "sub-prev-deces-family-single",
                            libelle: "Célibataire / veuf / sans enfant",
                            description: "Liste prédéfinie",
                            field_type: "select",
                            value_type_id: "percent_salary_reference_select",
                            min_hint: "≥ 100 %",
                            max_hint: "≤ 250 %"
                        },
                        {
                            id: "sub-prev-deces-family-maried",
                            libelle: "Marié ou CVDS avec personne à charge",
                            description: "Pourcentage personnalisé",
                            field_type: "radio",
                            value_type_id: "percent_salary_reference_input",
                            min_hint: "≥ 100 %",
                            max_hint: "≤ 250 %"
                        },
                        {
                            id: "sub-prev-deces-family-majoration",
                            libelle: "Majoration par enfant / personne à charge",
                            description: "Majoration supplémentaire par enfant",
                            field_type: "radio",
                            value_type_id: "percent_salary_reference_input",
                            min_hint: "≥ 0 %",
                            max_hint: "≤ 50 %"
                        }
                    ]
                }
            ]
        },
        {
            id: "prev-frais-obseques",
            libelle: "Frais d'obsèques",
            acts: [
                {
                    id: "act-prev-obseques-global",
                    label: "Couverture frais d'obsèques",
                    description: "Sélection du niveau pour salarié/conjoint/enfants",
                    field_type: "radio",
                    sub_items: [
                        {
                            id: "sub-prev-obseques-salarie",
                            libelle: "Salarié",
                            field_type: "select",
                            value_type_id: "percent_salary_reference_select",
                            min_hint: "≥ 50 %",
                            max_hint: "≤ 200 %"
                        },
                        {
                            id: "sub-prev-obseques-conjoint",
                            libelle: "Conjoint et enfants",
                            field_type: "select",
                            value_type_id: "percent_salary_reference_select",
                            min_hint: "≥ 50 %",
                            max_hint: "≤ 200 %"
                        }
                    ]
                }
            ]
        },
        {
            id: "prev-rente-education",
            libelle: "Rente éducation",
            acts: [
                {
                    id: "act-prev-rente-education-8-18-26",
                    label: "Formule 8 ans / 18 ans / 26 ans",
                    description: "Sélection des pourcentages par tranche",
                    field_type: "radio",
                    sub_items: [
                        {
                            id: "sub-prev-rente-8",
                            libelle: "Jusqu'à 8 ans",
                            field_type: "radio",
                            value_type_id: "percent_salary_reference_input",
                            min_hint: "≥ 4 %",
                            max_hint: "≤ 10 %"
                        },
                        {
                            id: "sub-prev-rente-18",
                            libelle: "De 9 à 18 ans",
                            field_type: "radio",
                            value_type_id: "percent_salary_reference_input",
                            min_hint: "≥ 6 %",
                            max_hint: "≤ 12 %"
                        },
                        {
                            id: "sub-prev-rente-26",
                            libelle: "De 19 à 26 ans",
                            field_type: "radio",
                            value_type_id: "percent_salary_reference_input",
                            min_hint: "≥ 6 %",
                            max_hint: "≤ 12 %"
                        },
                        {
                            id: "sub-prev-rente-viagere",
                            libelle: "Rente viagère enfants handicapés",
                            description: "Option (case à cocher)",
                            field_type: "checkbox",
                            value_type_id: "free_text"
                        }
                    ]
                }
            ]
        }
    ],
    offres_v1: [
        {
            "id": "94f62383-04b5-42d6-16cf-0d1e2f3a4b15",
            "code": "INTERPROF",
            "libelle": "Interprofessionnelle"
        },
        {
            "id": "32bf14ad-d20a-4b49-9177-2743694d280f",
            "code": "CCN_TRANSPORT_ROUTIER_DE_MARCHANDISES",
            "libelle": "CCN TRANSPORT ROUTIER DE MARCHANDISES"
        }
    ],
    catalogues_v1: [
        {
            "id": "12e61c72-0f20-458a-8496-571c5595f4c8",
            "offre_id": "94f62383-04b5-42d6-16cf-0d1e2f3a4b15",
            "risque": "santé",
            "annee": 2025,
            "version": "v1",
            "status": "draft",
            "valid_from": "2025-10-07",
            "valid_to": ""
        },
        {
            "id": "afa9a6ba-386f-4123-b9af-fbadd39e009f",
            "offre_id": "32bf14ad-d20a-4b49-9177-2743694d280f",
            "risque": "SANTE",
            "annee": 2025,
            "version": "V0",
            "status": "draft",
            "valid_from": "2025-10-08",
            "valid_to": ""
        },
        {
            "id": "c2d4b6f8-1a2b-4c3d-9e0f-1234567890ab",
            "offre_id": "94f62383-04b5-42d6-16cf-0d1e2f3a4b15",
            "risque": "PREVOYANCE",
            "annee": 2025,
            "version": "v1-prev",
            "status": "draft",
            "valid_from": "2025-10-15",
            "valid_to": "",
            "allow_multiple_niveaux": false,
            "default_niveau_set_id": "set-prevoyance-unique"
        }
    ],
    groupe_actes_v1: [
        {
            "id": "grp-prev-deces-capital",
            "catalogue_id": "c2d4b6f8-1a2b-4c3d-9e0f-1234567890ab",
            "ref_module_id": "9602b034-5824-4923-8595-2c2f763eed36",
            "nom": "Décès en capital",
            "priorite": 10,
            "ordre": 1,
            "cat_order": [],
            "sub_items": [
                {
                    "id": "sub-prev-deces-flat-principal",
                    "parent_act_id": "f0f75568-891a-400b-b647-f832e885adc2",
                    "libelle": "Montant principal",
                    "description": "Valeur principale délivrée côté client",
                    "field_type": "radio",
                    "value_type_id": "percent_salary_reference_select",
                    "min_hint": "≥ 100 %",
                    "max_hint": "≤ 250 %"
                },
                {
                    "id": "sub-prev-deces-flat-ptia",
                    "parent_act_id": "f0f75568-891a-400b-b647-f832e885adc2",
                    "libelle": "PTIA (toutes causes)",
                    "description": "Activation de l’option PTIA",
                    "field_type": "checkbox",
                    "value_type_id": "free_text"
                },
                {
                    "id": "sub-prev-deces-flat-accident",
                    "parent_act_id": "f0f75568-891a-400b-b647-f832e885adc2",
                    "libelle": "Décès accidentel / AVC",
                    "description": "Capital supplémentaire 100 %",
                    "field_type": "checkbox",
                    "value_type_id": "free_text"
                },
                {
                    "id": "sub-prev-deces-flat-double-effet",
                    "parent_act_id": "f0f75568-891a-400b-b647-f832e885adc2",
                    "libelle": "Double effet",
                    "description": "100 % supplémentaire en cas de double effet",
                    "field_type": "checkbox",
                    "value_type_id": "free_text"
                },
                {
                    "id": "sub-prev-deces-family-single",
                    "parent_act_id": "b27e11c7-9c0d-4e3b-9c33-b93d36ce8b01",
                    "libelle": "Célibataire / veuf / sans enfant",
                    "description": "Liste prédéfinie",
                    "field_type": "select",
                    "value_type_id": "percent_salary_reference_select",
                    "min_hint": "≥ 100 %",
                    "max_hint": "≤ 250 %"
                },
                {
                    "id": "sub-prev-deces-family-maried",
                    "parent_act_id": "b27e11c7-9c0d-4e3b-9c33-b93d36ce8b01",
                    "libelle": "Marié ou CVDS avec personne à charge",
                    "description": "Pourcentage personnalisé",
                    "field_type": "radio",
                    "value_type_id": "percent_salary_reference_input",
                    "min_hint": "≥ 100 %",
                    "max_hint": "≤ 250 %"
                },
                {
                    "id": "sub-prev-deces-family-majoration",
                    "parent_act_id": "b27e11c7-9c0d-4e3b-9c33-b93d36ce8b01",
                    "libelle": "Majoration par enfant / personne à charge",
                    "description": "Majoration supplémentaire par enfant",
                    "field_type": "radio",
                    "value_type_id": "percent_salary_reference_input",
                    "min_hint": "≥ 0 %",
                    "max_hint": "≤ 50 %"
                },
                {
                    "id": "sub-prev-capital-rente-capital",
                    "parent_act_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
                    "libelle": "Capital uniforme",
                    "description": "Pourcentage appliqué au salaire de référence",
                    "field_type": "radio",
                    "value_type_id": "percent_salary_reference_input",
                    "min_hint": "≥ 100 %",
                    "max_hint": "≤ 250 %"
                },
                {
                    "id": "sub-prev-rente-8",
                    "parent_act_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
                    "libelle": "Rente éducation jusqu'à 8 ans",
                    "field_type": "radio",
                    "value_type_id": "percent_salary_reference_input",
                    "min_hint": "≥ 4 %",
                    "max_hint": "≤ 10 %"
                },
                {
                    "id": "sub-prev-rente-18",
                    "parent_act_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
                    "libelle": "Rente éducation de 9 à 18 ans",
                    "field_type": "radio",
                    "value_type_id": "percent_salary_reference_input",
                    "min_hint": "≥ 6 %",
                    "max_hint": "≤ 12 %"
                },
                {
                    "id": "sub-prev-rente-26",
                    "parent_act_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
                    "libelle": "Rente éducation de 19 à 26 ans",
                    "field_type": "radio",
                    "value_type_id": "percent_salary_reference_input",
                    "min_hint": "≥ 6 %",
                    "max_hint": "≤ 12 %"
                },
                {
                    "id": "sub-prev-rente-viagere",
                    "parent_act_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
                    "libelle": "Rente viagère enfants handicapés",
                    "description": "Option (case à cocher)",
                    "field_type": "checkbox",
                    "value_type_id": "free_text"
                }
            ]
        }
    ],
    groupe_actes_membre_v1: [
        {
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "f0f75568-891a-400b-b647-f832e885adc2",
            "ordre": 1
        },
        {
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "b27e11c7-9c0d-4e3b-9c33-b93d36ce8b01",
            "ordre": 2
        },
        {
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "20ebeab8-4e9d-4537-a4fa-508fe37d04b0",
            "ordre": 3
        }
    ],
    groupe_valeur_v1: [
        {
            "id": "val-prev-flat",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-deces-flat-principal",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "125 % du salaire de référence",
            "value": "125 % du salaire de référence",
            "value_type": "percent_salary_reference_select",
            "type": "percent_salary_reference_select",
            "data_json": {
                "percent": "125%"
            }
        },
        {
            "id": "val-prev-flat-ptia",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-deces-flat-ptia",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "PTIA incluse",
            "value": "PTIA incluse",
            "value_type": "free_text",
            "type": "free_text",
            "data_json": {
                "label": "Incluse"
            }
        },
        {
            "id": "val-prev-flat-accident",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-deces-flat-accident",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "Double capital en cas d’AVC/accident",
            "value": "Double capital en cas d’AVC/accident",
            "value_type": "free_text",
            "type": "free_text",
            "data_json": {
                "label": "100 % supplémentaire"
            }
        },
        {
            "id": "val-prev-flat-double-effet",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-deces-flat-double-effet",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "Activation du double effet",
            "value": "Activation du double effet",
            "value_type": "free_text",
            "type": "free_text",
            "data_json": {
                "label": "Oui"
            }
        },
        {
            "id": "val-prev-family-single",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-deces-family-single",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "125 % du salaire de référence",
            "value": "125 % du salaire de référence",
            "value_type": "percent_salary_reference_select",
            "type": "percent_salary_reference_select",
            "data_json": {
                "percent": "125%"
            }
        },
        {
            "id": "val-prev-family-maried",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-deces-family-maried",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "180 % du salaire de référence",
            "value": "180 % du salaire de référence",
            "value_type": "percent_salary_reference_input",
            "type": "percent_salary_reference_input",
            "data_json": {
                "percent": 180
            }
        },
        {
            "id": "val-prev-family-majoration",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-deces-family-majoration",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "+55 % par enfant",
            "value": "+55 % par enfant",
            "value_type": "percent_salary_reference_input",
            "type": "percent_salary_reference_input",
            "data_json": {
                "percent": 55
            }
        },
        {
            "id": "val-prev-capital-rente",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-capital-rente-capital",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "150 % du salaire de référence",
            "value": "150 % du salaire de référence",
            "value_type": "percent_salary_reference_input",
            "type": "percent_salary_reference_input",
            "data_json": {
                "percent": 150
            }
        },
        {
            "id": "val-prev-rente-8",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-rente-8",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "6 % du salaire de référence",
            "value": "6 % du salaire de référence",
            "value_type": "percent_salary_reference_input",
            "type": "percent_salary_reference_input",
            "data_json": {
                "percent": 6
            }
        },
        {
            "id": "val-prev-rente-18",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-rente-18",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "8 % du salaire de référence",
            "value": "8 % du salaire de référence",
            "value_type": "percent_salary_reference_input",
            "type": "percent_salary_reference_input",
            "data_json": {
                "percent": 8
            }
        },
        {
            "id": "val-prev-rente-26",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-rente-26",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "10 % du salaire de référence",
            "value": "10 % du salaire de référence",
            "value_type": "percent_salary_reference_input",
            "type": "percent_salary_reference_input",
            "data_json": {
                "percent": 10
            }
        },
        {
            "id": "val-prev-rente-viagere",
            "groupe_id": "grp-prev-deces-capital",
            "act_id": "sub-prev-rente-viagere",
            "niveau_id": "niv-prev-base",
            "kind": "base",
            "mode": "texte_libre",
            "base": "inconnu",
            "taux": null,
            "montant": null,
            "unite": "inconnu",
            "plafond_montant": null,
            "plafond_unite": null,
            "periodicite": null,
            "condition_json": null,
            "expression": "",
            "commentaire": "Option disponible sur accord médical",
            "value": "Option disponible sur accord médical",
            "value_type": "free_text",
            "type": "free_text",
            "data_json": {
                "label": "Sur demande"
            }
        }
    ],



};
