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

            // Match: FieldName Type `tags`
            const fieldMatch = trimmed.match(/^(\w+)\s+(\*?[\w\[\]\.]+)(?:\s+`([^`]+)`)?/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const fieldType = fieldMatch[2];
                const tagsStr = fieldMatch[3] || '';
                
                let jsonTag = '';
                
                if (tagsStr) {
                    const jsonMatch = tagsStr.match(/json:"([^"]+)"/);
                    if (jsonMatch) {
                        jsonTag = jsonMatch[1].split(',')[0];
                    }
                }

                // Skip fields explicitly marked with "-"
                if (jsonTag === '-') {
                    continue;
                }

                fields.push({
                    name: fieldName,
                    type: fieldType,
                    jsonName: jsonTag || fieldName
                });
            }
        }
        return fields;
    }

    /**
     * Generate sample JSON from struct info
     */
    generateJSON(struct: StructInfo, allStructs: StructInfo[]): any {
        const result: any = {};
        for (const field of struct.fields) {
            const jsonKey = field.jsonName || field.name;
            result[jsonKey] = this.getDefaultValue(field.type, allStructs);
        }
        return result;
    }

    private getDefaultValue(goType: string, allStructs: StructInfo[]): any {
        const cleanType = goType.replace('*', '').replace('[]', '');
        
        if (goType.startsWith('[]')) {
            const val = this.getDefaultValue(cleanType, allStructs);
            return val !== null ? [val] : [];
        }

        switch (cleanType) {
            case 'string': return "string";
            case 'int':
            case 'int32':
            case 'int64':
            case 'uint':
            case 'uint32':
            case 'uint64':
            case 'float32':
            case 'float64': return 0;
            case 'bool': return false;
            case 'time.Time': return new Date().toISOString();
            default:
                if (cleanType.startsWith('map[')) return {};
                if (cleanType === 'interface{}' || cleanType === 'any') return {};
                
                // Recursive lookup
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
