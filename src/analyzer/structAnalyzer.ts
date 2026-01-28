import { StructField, StructInfo } from './types';

export class StructAnalyzer {
    parseStructs(content: string): StructInfo[] {
        const structs: StructInfo[] = [];
        const structRegex = /type\s+(\w+)\s+struct\s*\{([^}]+)\}/g;
        let match;

        while ((match = structRegex.exec(content)) !== null) {
            const structName = match[1];
            const fieldsBlock = match[2];
            const fields = this.parseFields(fieldsBlock);

            structs.push({
                name: structName,
                fields
            });
        }

        return structs;
    }

    private parseFields(fieldsBlock: string): StructField[] {
        const fields: StructField[] = [];
        const lines = fieldsBlock.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) {
                continue;
            }

            const fieldMatch = trimmed.match(/^(\w+)\s+(\*?[\w\[\]\.]+)(?:\s+`json:"([^"]+)"`)?/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const fieldType = fieldMatch[2];
                const jsonTag = fieldMatch[3] || fieldName;

                if (jsonTag === '-') {
                    continue;
                }

                fields.push({
                    name: fieldName,
                    type: fieldType,
                    jsonName: jsonTag.split(',')[0]
                });
            }
        }

        return fields;
    }

    generateJSON(structInfo: StructInfo, allStructs: StructInfo[] = []): any {
        const result: any = {};

        for (const field of structInfo.fields) {
            const jsonName = field.jsonName || field.name;
            result[jsonName] = this.getDefaultValue(field.type, allStructs);
        }

        return result;
    }

    private getDefaultValue(goType: string, allStructs: StructInfo[]): any {
        const cleanType = goType.replace('*', '');

        if (cleanType.startsWith('[')) {
            const innerType = cleanType.match(/\[\](.+)/)?.[1];
            if (innerType) {
                return [this.getDefaultValue(innerType, allStructs)];
            }
            return [];
        }

        switch (cleanType) {
            case 'string':
                return 'string';
            case 'int':
            case 'int8':
            case 'int16':
            case 'int32':
            case 'int64':
            case 'uint':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'uint64':
                return 0;
            case 'float32':
            case 'float64':
                return 0.0;
            case 'bool':
                return false;
            case 'time.Time':
                return new Date().toISOString();
            default:
                const customStruct = allStructs.find(s => s.name === cleanType);
                if (customStruct) {
                    return this.generateJSON(customStruct, allStructs);
                }
                return null;
        }
    }

    findStruct(structs: StructInfo[], name: string): StructInfo | null {
        return structs.find(s => s.name === name) || null;
    }

    generateJSONFromName(content: string, structName: string): any {
        const structs = this.parseStructs(content);
        const targetStruct = this.findStruct(structs, structName);

        if (!targetStruct) {
            return {};
        }

        return this.generateJSON(targetStruct, structs);
    }
}
