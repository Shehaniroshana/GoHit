export interface StructField {
    name: string;
    type: string;
    jsonName?: string;
}

export interface StructInfo {
    name: string;
    fields: StructField[];
}
