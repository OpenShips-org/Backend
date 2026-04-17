import Type from "typebox"

export const VesselPositionSchema = Type.Object({
    mmsi: Type.Number({ examples: [205227090, 205585190, 205491290, 209410000] }),
    vesselName: Type.String({ examples: ['DONAU', 'PRESTIGE', 'RIVER DRONE 2', 'SANTIAGO'] }),
    navigationalStatus: Type.Number({ examples: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }),
    rateOfTurn: Type.Number({ examples: [-128, -64, 0, 64, 127] }),
    speedOverGround: Type.Number({ examples: [0, 10, 20, 30] }),
    courseOverGround: Type.Number({ examples: [0, 90, 180, 270] }),
    heading: Type.Number({ examples: [0, 90, 180, 270] }),
    longitude: Type.Number({ examples: [10.0, 20.0, 30.0] }),
    latitude: Type.Number({ examples: [10.0, 20.0, 30.0] }),
    specialManoeuvre: Type.Number({ examples: [0, 1] }),
    communicationState: Type.Number({ examples: [0, 1] }),
    timestamp: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })
})

export const VesselStaticSchema = Type.Object({
    mmsi: Type.Number({ examples: [205227090, 205585190, 205491290, 209410000] }),
    vesselName: Type.String({ examples: ['DONAU', 'PRESTIGE', 'RIVER DRONE 2', 'SANTIAGO'] }),
    imo: Type.Number({ examples: [1234567, 2345678, 3456789, 4567890] }),
    callSign: Type.String({ examples: ['CALLSIGN1', 'CALLSIGN2', 'CALLSIGN3', 'CALLSIGN4'] }),
    destination: Type.String({ examples: ['Port A', 'Port B', 'Port C', 'Port D'] }),
    vesselType: Type.Number({ examples: [70, 80, 90, 100] }),
    maxDraught: Type.Number({ examples: [5.0, 10.0, 15.0, 20.0] }),
    dimensionA: Type.Number({ examples: [10, 20, 30, 40] }),
    dimensionB: Type.Number({ examples: [5, 10, 15, 20] }),
    dimensionC: Type.Number({ examples: [2, 4, 6, 8] }),
    dimensionD: Type.Number({ examples: [1, 2, 3, 4] }),
    eta: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }),
    timestamp: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }),

    scrapedDataStatus: Type.Enum(['cached', 'in queue', 'error', 'not requested'], { description: 'Indicates the status of the scraped data retrieval process' }),

    scrapedVesselData: Type.Optional(Type.Object({
        imoNumber: Type.Number({ examples: [1234567, 2345678, 3456789, 4567890] }),
        mmsiNumber: Type.Optional(Type.Number({ examples: [205227090, 205585190, 205491290, 209410000] })),
        vesselName: Type.Optional(Type.String({ examples: ['DONAU', 'PRESTIGE', 'RIVER DRONE 2', 'SANTIAGO'] })),
        flag: Type.Optional(Type.String({ examples: ['Germany', 'Panama', 'Liberia', 'Marshall Islands'] })),
        callSign: Type.Optional(Type.String({ examples: ['CALLSIGN1', 'CALLSIGN2', 'CALLSIGN3', 'CALLSIGN4'] })),
        vesselType: Type.Optional(Type.String({ examples: ['Cargo', 'Tanker', 'Passenger', 'Fishing'] })),
        grossTonnage: Type.Optional(Type.Number({ examples: [10000, 50000, 100000, 200000] })),
        dwt: Type.Optional(Type.Number({ examples: [5000, 25000, 50000, 100000] })),
        yearBuilt: Type.Optional(Type.Number({ examples: [1990, 2000, 2010, 2020] })),
        status: Type.Optional(Type.String({ examples: ['Active', 'Inactive', 'Scrapped', 'Under Construction'] })),
        statusDate: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
        lastUpdate: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
        hasDnvEntry: Type.Boolean(),
        hasEquasisEntry: Type.Boolean(),

        dnvData: Type.Optional(Type.Object({
            identification: Type.Optional(Type.Object({
                vesselName: Type.Optional(Type.String({ examples: ['DONAU', 'PRESTIGE', 'RIVER DRONE 2', 'SANTIAGO'] })),
                vesselId: Type.Optional(Type.String({ examples: ['VesselID1', 'VesselID2', 'VesselID3', 'VesselID4'] })),
                imoNumber: Type.Optional(Type.String({ examples: ['1234567', '2345678', '3456789', '4567890'] })),
                officialNumber: Type.Optional(Type.String({ examples: ['OfficialNumber1', 'OfficialNumber2', 'OfficialNumber3', 'OfficialNumber4'] })),
                nonClassRelationString: Type.Optional(Type.String({ examples: ['Relation1', 'Relation2', 'Relation3', 'Relation4'] })),
                classStatusString: Type.Optional(Type.String({ examples: ['ClassStatus1', 'ClassStatus2', 'ClassStatus3', 'ClassStatus4'] })),
                operationalStatusString: Type.Optional(Type.String({ examples: ['OperationalStatus1', 'OperationalStatus2', 'OperationalStatus3', 'OperationalStatus4'] })),
                signalLetters: Type.Optional(Type.String({ examples: ['Signal1', 'Signal2', 'Signal3', 'Signal4'] })),
                homePort: Type.Optional(Type.String({ examples: ['Port A', 'Port B', 'Port C', 'Port D'] })),
                typeFormatted: Type.Optional(Type.String({ examples: ['Type1', 'Type2', 'Type3', 'Type4'] })),
                register: Type.Optional(Type.String({ examples: ['Register1', 'Register2', 'Register3', 'Register4'] })),
                flagName: Type.Optional(Type.String({ examples: ['Germany', 'Panama', 'Liberia', 'Marshall Islands'] })),
                flagCode: Type.Optional(Type.String({ examples: ['DEU', 'PAN', 'LBR', 'MHL'] })),
                purposes: Type.Optional(Type.Array(Type.Object({
                    oid: Type.String({ examples: ['OID1', 'OID2', 'OID3', 'OID4'] }),
                    purpose: Type.String({ examples: ['Purpose1', 'Purpose2', 'Purpose3', 'Purpose4'] }),
                    description: Type.String({ examples: ['Description1', 'Description2', 'Description3', 'Description4'] }),
                    isMainPurpose: Type.Boolean()
                })))
            })),
            owner: Type.Optional(Type.Object({
                ownerName: Type.Optional(Type.String({ examples: ['Owner1', 'Owner2', 'Owner3', 'Owner4'] })),
                ownerImoNumber: Type.Optional(Type.String({ examples: ['1234567', '2345678', '3456789', '4567890'] })),
                ownerDnvId: Type.Optional(Type.String({ examples: ['DNVId1', 'DNVId2', 'DNVId3', 'DNVId4'] })),
                managerName: Type.Optional(Type.String({ examples: ['Manager1', 'Manager2', 'Manager3', 'Manager4'] })),
                managerImoNumber: Type.Optional(Type.String({ examples: ['1234567', '2345678', '3456789', '4567890'] })),
                managerDnvId: Type.Optional(Type.String({ examples: ['DNVId1', 'DNVId2', 'DNVId3', 'DNVId4'] })),
                docHolderName: Type.Optional(Type.String({ examples: ['DocHolder1', 'DocHolder2', 'DocHolder3', 'DocHolder4'] })),
                docHolderImoNumber: Type.Optional(Type.String({ examples: ['1234567', '2345678', '3456789', '4567890'] })),
                docHolderDnvId: Type.Optional(Type.String({ examples: ['DNVId1', 'DNVId2', 'DNVId3', 'DNVId4'] }))
            })),
            classification: Type.Optional(Type.Object({
                mainClass: Type.Optional(Type.String({ examples: ['MainClass1', 'MainClass2', 'MainClass3', 'MainClass4'] })),
                mainClassMachinery: Type.Optional(Type.String({ examples: ['MainClassMachinery1', 'MainClassMachinery2', 'MainClassMachinery3', 'MainClassMachinery4'] })),
                classNotationString: Type.Optional(Type.String({ examples: ['ClassNotation1', 'ClassNotation2', 'ClassNotation3', 'ClassNotation4'] })),
                classNotationStringInOperation: Type.Optional(Type.String({ examples: ['InOperation1', 'InOperation2', 'InOperation3', 'InOperation4'] })),
                constructionSymbol: Type.Optional(Type.String({ examples: ['ConstructionSymbol1', 'ConstructionSymbol2', 'ConstructionSymbol3', 'ConstructionSymbol4'] })),
                constructionSymbolMachinery: Type.Optional(Type.String({ examples: ['ConstructionSymbolMachinery1', 'ConstructionSymbolMachinery2', 'ConstructionSymbolMachinery3', 'ConstructionSymbolMachinery4'] })),
                classNotationStringMachinery: Type.Optional(Type.String({ examples: ['ClassNotationMachinery1', 'ClassNotationMachinery2', 'ClassNotationMachinery3', 'ClassNotationMachinery4'] })),
                constructionSymbolRefrigeration: Type.Optional(Type.String({ examples: ['ConstructionSymbolRefrigeration1', 'ConstructionSymbolRefrigeration2', 'ConstructionSymbolRefrigeration3', 'ConstructionSymbolRefrigeration4'] })),
                classNotationStringStructuralDesign: Type.Optional(Type.String({ examples: ['StructuralDesign1', 'StructuralDesign2', 'StructuralDesign3', 'StructuralDesign4'] })),
                classNotationStringModular: Type.Optional(Type.String({ examples: ['Modular1', 'Modular2', 'Modular3', 'Modular4'] })),
                classNotationStringVesselType: Type.Optional(Type.String({ examples: ['VesselType1', 'VesselType2', 'VesselType3', 'VesselType4'] })),
                classNotationStringDesign: Type.Optional(Type.String({ examples: ['Design1', 'Design2', 'Design3', 'Design4'] })),
                classNotationStringDescriptive: Type.Optional(Type.String({ examples: ['Descriptive1', 'Descriptive2', 'Descriptive3', 'Descriptive4'] })),
                classNotationStringServiceArea: Type.Optional(Type.String({ examples: ['ServiceArea1', 'ServiceArea2', 'ServiceArea3', 'ServiceArea4'] })),
                mainClassRefrigeration: Type.Optional(Type.String({ examples: ['MainClassRefrigeration1', 'MainClassRefrigeration2', 'MainClassRefrigeration3', 'MainClassRefrigeration4'] })),
                classNotationStringRefrigeration: Type.Optional(Type.String({ examples: ['ClassNotationRefrigeration1', 'ClassNotationRefrigeration2', 'ClassNotationRefrigeration3', 'ClassNotationRefrigeration4'] })),
                classNotationStringMain: Type.Optional(Type.String({ examples: ['ClassNotationMain1', 'ClassNotationMain2', 'ClassNotationMain3', 'ClassNotationMain4'] })),
                classNotationStringMainMachinery: Type.Optional(Type.String({ examples: ['ClassNotationMainMachinery1', 'ClassNotationMainMachinery2', 'ClassNotationMainMachinery3', 'ClassNotationMainMachinery4'] })),
                registerNotationString: Type.Optional(Type.String({ examples: ['RegisterNotation1', 'RegisterNotation2', 'RegisterNotation3', 'RegisterNotation4'] })),
                converted: Type.Optional(Type.Object({
                    date: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                    comment: Type.Optional(Type.String({ examples: ['Conversion comment 1', 'Conversion comment 2', 'Conversion comment 3', 'Conversion comment 4'] }))
                })),
                lastClassificationSociety: Type.Optional(Type.String({ examples: ['Society1', 'Society2', 'Society3', 'Society4'] })),
                classEntryDate: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                dualClass: Type.Optional(Type.String({ examples: ['DualClass1', 'DualClass2', 'DualClass3', 'DualClass4'] })),
                equipmentNumber: Type.Optional(Type.String({ examples: ['EquipmentNumber1', 'EquipmentNumber2', 'EquipmentNumber3', 'EquipmentNumber4'] })),
                classRequestDate: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                classAssignmentDate: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                commissioningDate: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }))
            })),
            certificates: Type.Optional(Type.Array(Type.Object({
                oid: Type.String({ examples: ['OID1', 'OID2', 'OID3', 'OID4'] }),
                code: Type.String({ examples: ['Code1', 'Code2', 'Code3', 'Code4'] }),
                certificate: Type.String({ examples: ['Certificate1', 'Certificate2', 'Certificate3', 'Certificate4'] }),
                type: Type.String({ examples: ['Type1', 'Type2', 'Type3', 'Type4'] }),
                term: Type.String({ examples: ['Term1', 'Term2', 'Term3', 'Term4'] }),
                issued: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                expires: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                extUntil: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }))
            }))),
            surveys: Type.Optional(Type.Array(Type.Object({
                oid: Type.String({ examples: ['OID1', 'OID2', 'OID3', 'OID4'] }),
                survey: Type.String({ examples: ['Survey1', 'Survey2', 'Survey3', 'Survey4'] }),
                category: Type.String({ examples: ['Category1', 'Category2', 'Category3', 'Category4'] }),
                location: Type.String({ examples: ['Location1', 'Location2', 'Location3', 'Location4'] }),
                lastDate: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                dueFrom: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                dueTo: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                postponed: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }))
            }))),
            conditions: Type.Optional(Type.Union([
                Type.Array(Type.Record(Type.String(), Type.Unknown())),
                Type.Null()
            ])),
            yard: Type.Optional(Type.Object({
                hullYardName: Type.String({ examples: ['HullYard1', 'HullYard2', 'HullYard3', 'HullYard4'] }),
                hullYardBuilderNo: Type.Optional(Type.String({ examples: ['BuilderNo1', 'BuilderNo2', 'BuilderNo3', 'BuilderNo4'] })),
                hullYardBuildNo: Type.Optional(Type.String({ examples: ['BuildNo1', 'BuildNo2', 'BuildNo3', 'BuildNo4'] })),
                contractedBuilder: Type.String({ examples: ['ContractedBuilder1', 'ContractedBuilder2', 'ContractedBuilder3', 'ContractedBuilder4'] }),
                contractedBuilderNo: Type.Optional(Type.String({ examples: ['ContractedBuilderNo1', 'ContractedBuilderNo2', 'ContractedBuilderNo3', 'ContractedBuilderNo4'] })),
                contractedBuilderBuildNo: Type.Optional(Type.String({ examples: ['ContractedBuildNo1', 'ContractedBuildNo2', 'ContractedBuildNo3', 'ContractedBuildNo4'] })),
                keelDate: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                dateOfBuild: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }))
            })),
            dimensions: Type.Optional(Type.Object({
                lengthOverall: Type.Optional(Type.Number({ examples: [100.0, 200.0, 300.0, 400.0] })),
                lbp: Type.Optional(Type.Number({ examples: [90.0, 180.0, 270.0, 360.0] })),
                bm: Type.Optional(Type.Number({ examples: [10.0, 20.0, 30.0, 40.0] })),
                dm: Type.Optional(Type.Number({ examples: [5.0, 10.0, 15.0, 20.0] })),
                draught: Type.Optional(Type.Number({ examples: [5.0, 10.0, 15.0, 20.0] })),
                dwt: Type.Optional(Type.Number({ examples: [5000, 25000, 50000, 100000] })),
                grossTon69: Type.Optional(Type.Number({ examples: [10000, 50000, 100000, 200000] })),
                netTon69: Type.Optional(Type.Number({ examples: [5000, 25000, 50000, 100000] }))
            })),
            hull: Type.Optional(Type.Object({
                decksNumber: Type.Optional(Type.Union([Type.Number({ examples: [1, 2, 3, 4] }), Type.Literal('')]))
            })),
            machinery: Type.Optional(Type.Object({
                mainPropulsion: Type.Optional(Type.String({ examples: ['MainPropulsion1', 'MainPropulsion2', 'MainPropulsion3', 'MainPropulsion4'] }))
            })),
        })),

        equasisData: Type.Optional(Type.Object({
            basicInfo: Type.Optional(Type.Object({
                imo: Type.String({ examples: ['1234567', '2345678', '3456789', '4567890'] }),
                name: Type.String({ examples: ['DONAU', 'PRESTIGE', 'RIVER DRONE 2', 'SANTIAGO'] }),
                flag: Type.String({ examples: ['Germany', 'Panama', 'Liberia', 'Marshall Islands'] }),
                flag_code: Type.Optional(Type.String({ examples: ['DEU', 'PAN', 'LBR', 'MHL'] })),
                call_sign: Type.Optional(Type.String({ examples: ['CALLSIGN1', 'CALLSIGN2', 'CALLSIGN3', 'CALLSIGN4'] })),
                mmsi: Type.Optional(Type.String({ examples: ['205227090', '205585190', '205491290', '209410000'] })),
                gross_tonnage: Type.Optional(Type.Number({ examples: [10000, 50000, 100000, 200000] })),
                dwt: Type.Optional(Type.Number({ examples: [5000, 25000, 50000, 100000] })),
                vessel_type: Type.Optional(Type.String({ examples: ['Cargo', 'Tanker', 'Passenger', 'Fishing'] })),
                year_built: Type.Optional(Type.Number({ examples: [1990, 2000, 2010, 2020] })),
                status: Type.Optional(Type.String({ examples: ['Active', 'Inactive', 'Scrapped', 'Under Construction'] })),
                status_date: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] })),
                last_update: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }))
            })),
            management: Type.Optional(Type.Array(Type.Object({
                imo: Type.Optional(Type.String({ examples: ['1234567', '2345678', '3456789', '4567890'] })),
                name: Type.String({ examples: ['Company1', 'Company2', 'Company3', 'Company4'] }),
                role: Type.String({ examples: ['Owner', 'Manager', 'Operator', 'Charterer'] }),
                address: Type.Optional(Type.String({ examples: ['Address1', 'Address2', 'Address3', 'Address4'] })),
                date_effect: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }))
            }))),
            classification: Type.Optional(Type.Array(Type.Object({
                society: Type.String({ examples: ['Society1', 'Society2', 'Society3', 'Society4'] }),
                status: Type.String({ examples: ['Classed', 'Not Classed', 'In Survey', 'Out of Class'] }),
                date_effect: Type.Optional(Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }))
            }))),
            inspections: Type.Optional(Type.Array(Type.Object({
                authority: Type.Optional(Type.String({ examples: ['Authority1', 'Authority2', 'Authority3', 'Authority4'] })),
                port: Type.Optional(Type.String({ examples: ['Port A', 'Port B', 'Port C', 'Port D'] })),
                date: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }),
                detention: Type.String({ examples: ['Yes', 'No'] }),
                psc_organization: Type.String({ examples: ['Organization1', 'Organization2', 'Organization3', 'Organization4'] }),
                inspection_type: Type.Optional(Type.String({ examples: ['Type1', 'Type2', 'Type3', 'Type4'] })),
                duration: Type.Optional(Type.String({ examples: ['1 day', '2 days', '3 days', '4 days'] })),
                deficiencies: Type.Optional(Type.String({ examples: ['Deficiency1', 'Deficiency2', 'Deficiency3', 'Deficiency4'] })),
                inspection_id: Type.Optional(Type.String({ examples: ['InspectionID1', 'InspectionID2', 'InspectionID3', 'InspectionID4'] }))
            }))),
            historicalNames: Type.Optional(Type.Array(Type.Object({
                name: Type.String({ examples: ['OldName1', 'OldName2', 'OldName3', 'OldName4'] }),
                date_effect: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }),
                source: Type.String({ examples: ['Source1', 'Source2', 'Source3', 'Source4'] })
            }))),
            historicalFlags: Type.Optional(Type.Array(Type.Object({
                flag: Type.String({ examples: ['Germany', 'Panama', 'Liberia', 'Marshall Islands'] }),
                date_effect: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }),
                source: Type.String({ examples: ['Source1', 'Source2', 'Source3', 'Source4'] })
            }))),
            historicalCompanies: Type.Optional(Type.Array(Type.Object({
                company: Type.String({ examples: ['Company1', 'Company2', 'Company3', 'Company4'] }),
                role: Type.String({ examples: ['Owner', 'Manager', 'Operator', 'Charterer'] }),
                date_effect: Type.String({ format: 'date-time', examples: ['2024-06-01T12:00:00Z'] }),
                source: Type.String({ examples: ['Source1', 'Source2', 'Source3', 'Source4'] })
            })))    
        }))
    }))
})