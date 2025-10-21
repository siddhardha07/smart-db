import { MermaidEntity, MermaidAttribute, ParsedDiagram } from '../types';

/**
 * Parse Mermaid ER diagram text and extract entities with their attributes
 */
export class MermaidParser {
  private static readonly ENTITY_REGEX = /(\w+)\s*\{([^}]*)\}/g;
  private static readonly ATTRIBUTE_REGEX = /(\w+)\s+(\w+)/g;

  /**
   * Parse a Mermaid ER diagram text
   * @param mermaidText - The Mermaid ER diagram text
   * @returns Parsed diagram with entities and attributes
   */
  static parse(mermaidText: string): ParsedDiagram {
    try {
      // Remove erDiagram declaration and clean up text
      const cleanText = mermaidText
        .replace(/erDiagram\s*/i, '')
        .trim();

      const entities: MermaidEntity[] = [];
      let match;

      // Extract entities and their attributes
      while ((match = this.ENTITY_REGEX.exec(cleanText)) !== null) {
        const entityName = match[1]?.trim();
        const attributesBlock = match[2]?.trim();

        if (entityName && attributesBlock) {
          const attributes = this.parseAttributes(attributesBlock);
          entities.push({
            name: entityName,
            attributes
          });
        }
      }

      if (entities.length === 0) {
        throw new Error('No valid entities found in the Mermaid diagram');
      }

      return { entities };
    } catch (error) {
      throw new Error(`Failed to parse Mermaid diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse attributes from an entity block
   * @param attributesBlock - The text inside entity braces
   * @returns Array of parsed attributes
   */
  private static parseAttributes(attributesBlock: string): MermaidAttribute[] {
    const attributes: MermaidAttribute[] = [];
    const lines = attributesBlock.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Match type and name pattern
      const match = trimmedLine.match(/(\w+)\s+(\w+)/);
      if (match) {
        const type = match[1]?.trim();
        const name = match[2]?.trim();

        if (type && name) {
          attributes.push({ type, name });
        }
      }
    }

    return attributes;
  }

  /**
   * Validate if the input text contains a valid Mermaid ER diagram
   * @param text - Text to validate
   * @returns True if valid, false otherwise
   */
  static isValidMermaidDiagram(text: string): boolean {
    try {
      // Check for erDiagram keyword
      if (!/erDiagram/i.test(text)) {
        return false;
      }

      // Try to parse and see if we get any entities
      const parsed = this.parse(text);
      return parsed.entities.length > 0;
    } catch {
      return false;
    }
  }
}