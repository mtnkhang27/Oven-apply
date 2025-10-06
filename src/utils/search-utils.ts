import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * Utility class for advanced search functionality using fuzzy matching and relevance scoring.
 * Provides methods to enhance TypeORM query builders with intelligent search capabilities.
 *
 * Features:
 * - Levenshtein distance-based fuzzy matching
 * - Multi-strategy search (exact, prefix, regex, word-based)
 * - Relevance scoring for result ranking
 * - Abbreviation generation
 *
 * @example
 * ```typescript
 * const qb = repository.createQueryBuilder('product');
 * SearchUtils.applyLevenshteinSearch(qb, 'product', 'name', 'laptop');
 * SearchUtils.addRelevanceScoring(qb, 'product', 'name', 'laptop');
 * qb.orderBy('relevance_score', 'DESC');
 * ```
 */
export class SearchUtils {
  /**
   * Applies multi-strategy fuzzy search to a QueryBuilder using Levenshtein distance algorithm.
   * This method combines several search strategies to provide flexible and intelligent matching.
   *
   * Search strategies applied (in order of priority):
   * 1. **Exact match**: Direct case-insensitive match
   * 2. **Prefix match**: Starts with search term
   * 3. **Ordered regex**: All words appear in order (any spacing)
   * 4. **All words match**: Each word appears anywhere in field
   * 5. **Normalized match**: Match without spaces
   * 6. **Levenshtein distance**: Fuzzy match based on edit distance (skipped for short keywords)
   *
   * @template T - Entity type extending ObjectLiteral
   * @param qb - TypeORM SelectQueryBuilder to modify
   * @param alias - Table alias in the query
   * @param field - Database column name to search in
   * @param searchValue - User's search input
   *
   * @example
   * ```typescript
   * // Search for "macbook pro" in product names
   * const qb = productRepository.createQueryBuilder('product');
   * SearchUtils.applyLevenshteinSearch(qb, 'product', 'name', 'macbook pro');
   *
   * // Will match:
   * // - "MacBook Pro" (exact)
   * // - "MacBook Pro 2024" (prefix)
   * // - "Apple MacBook Pro M3" (all words)
   * // - "MacBookPro" (normalized)
   * // - "Macbok Pro" (typo, levenshtein)
   * ```
   *
   * @remarks
   * - Levenshtein matching is disabled for searches containing words ≤3 characters to avoid false positives
   * - Distance threshold is 30% of normalized search length
   * - Uses PostgreSQL-specific functions (ILIKE, levenshtein, unnest, string_to_array)
   */
  static applyLevenshteinSearch<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    field: string,
    searchValue: string,
    maxDistance = 3,
  ): void {
    const paramName = `${field}_search`;
    const distanceParam = `${field}_distance`;

    // Prepare search variations
    const normalizedSearch = searchValue.replace(/\s+/g, '').toLowerCase(); // "macbook pro" → "macbookpro"
    const originalSearch = searchValue.trim(); // Preserve original spacing

    // Split into individual words for word-based matching
    const searchWords = originalSearch
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    // Check if any keyword is too short (≤3 chars) to avoid false positives in fuzzy matching
    const hasShortKeyword = searchWords.some((word) => word.length <= 3);

    qb.andWhere(
      `(
        -- Strategy 1: Exact match (case-insensitive)
        ${alias}.${field} ILIKE :${paramName}_exact
        
        -- Strategy 2: Prefix match (starts with search term)
        OR ${alias}.${field} ILIKE :${paramName}_starts
        
        -- Strategy 3: Ordered regex (all words in order, flexible spacing)
        OR ${alias}.${field} ~* :${paramName}_regex_ordered
        
        -- Strategy 4: All words present (AND condition)
        OR (${searchWords
          .map((_, i) => `${alias}.${field} ILIKE :${paramName}_word${i}`)
          .join(' AND ')})
        
        -- Strategy 5: Normalized match (ignore spaces)
        OR REPLACE(LOWER(${alias}.${field}), ' ', '') LIKE :${paramName}_normalized_like
        
        -- Strategy 6: Levenshtein fuzzy match (only if no short keywords)
        OR (
          ${hasShortKeyword ? 'FALSE' : 'TRUE'} 
          AND EXISTS (
            -- Check if any word in the field is similar to search term
            SELECT 1 FROM unnest(string_to_array(LOWER(${alias}.${field}), ' ')) AS word
            WHERE levenshtein(word, :${paramName}_normalized) <= :${distanceParam}
          )
          -- Fallback: substring match
          OR ${alias}.${field} ILIKE '%' || :${paramName}_normalized || '%'
        )
      )`,
      {
        // Exact match parameter
        [`${paramName}_exact`]: originalSearch,

        // Prefix match parameter
        [`${paramName}_starts`]: `${originalSearch}%`,

        // Regex pattern: .*word1.*word2.*word3.*
        [`${paramName}_regex_ordered`]: searchWords
          .map((word) => `.*${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`)
          .join(''),

        // Individual word parameters for AND matching
        ...searchWords.reduce(
          (acc, word, i) => ({
            ...acc,
            [`${paramName}_word${i}`]: `%${word}%`,
          }),
          {},
        ),

        // Normalized search parameters
        [`${paramName}_normalized`]: normalizedSearch,
        [`${paramName}_normalized_like`]: `%${normalizedSearch}%`,

        // Levenshtein distance threshold (30% of search length, minimum 1)
        [distanceParam]: Math.min(maxDistance, Math.floor(normalizedSearch.length * 0.3)),

        // Length constraint for fuzzy matching
        maxLength: normalizedSearch.length + 5,
      },
    );
  }

  /**
   * Adds relevance scoring to search results for intelligent ranking.
   * Assigns numerical scores based on match quality to enable sorting by relevance.
   *
   * Scoring system:
   * - 100 points: Exact match (case-insensitive)
   * - 90 points: Prefix match
   * - 80 points: Ordered word match (regex)
   * - 70 points: All words present
   * - 60 points: Normalized match (no spaces)
   * - 40 points: Other matches (fuzzy/partial)
   *
   * @template T - Entity type extending ObjectLiteral
   * @param qb - TypeORM SelectQueryBuilder to modify
   * @param alias - Table alias in the query
   * @param field - Database column name to score
   * @param searchValue - User's search input
   *
   * @example
   * ```typescript
   * const qb = productRepository.createQueryBuilder('product');
   * SearchUtils.applyLevenshteinSearch(qb, 'product', 'name', 'iphone');
   * SearchUtils.addRelevanceScoring(qb, 'product', 'name', 'iphone');
   *
   * // Order by relevance
   * qb.orderBy('relevance_score', 'DESC');
   *
   * // Results will be ranked:
   * // 1. "iPhone" (100 - exact)
   * // 2. "iPhone 15 Pro" (90 - prefix)
   * // 3. "Apple iPhone" (70 - word match)
   * // 4. "i Phone" (60 - normalized)
   * ```
   *
   * @remarks
   * - Adds a computed column named 'relevance_score' to SELECT
   * - Must be used after applyLevenshteinSearch() for consistent parameter names
   * - Can combine with other ORDER BY clauses for secondary sorting
   */
  static addRelevanceScoring<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    field: string,
    searchValue: string,
  ): void {
    const paramName = `${field}_search`;
    const normalizedSearch = searchValue.replace(/\s+/g, '').toLowerCase();
    const searchWords = searchValue
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    // Add computed relevance score column
    qb.addSelect(
      `
      CASE
        -- Highest priority: Exact match
        WHEN LOWER(${alias}.${field}) = :${paramName}_lower_exact THEN 100
        
        -- High priority: Starts with search term
        WHEN LOWER(${alias}.${field}) LIKE :${paramName}_lower_starts THEN 90
        
        -- Medium-high: Words in correct order
        WHEN ${alias}.${field} ~* :${paramName}_regex_ordered THEN 80
        
        -- Medium: All words present
        WHEN ${searchWords
          .map((_, i) => `${alias}.${field} ILIKE :${paramName}_word${i}`)
          .join(' AND ')} THEN 70
        
        -- Medium-low: Match without spaces
        WHEN REPLACE(LOWER(${alias}.${field}), ' ', '') LIKE :${paramName}_normalized_like THEN 60
        
        -- Default: Other matches (fuzzy/partial)
        ELSE 40
      END
    `,
      'relevance_score',
    );

    // Set parameters for scoring conditions
    qb.setParameters({
      [`${paramName}_lower_exact`]: searchValue.toLowerCase(),
      [`${paramName}_lower_starts`]: `${searchValue.toLowerCase()}%`,
      [`${paramName}_regex_ordered`]: searchWords
        .map((word) => `.*${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`)
        .join(''),
      ...searchWords.reduce(
        (acc, word, i) => ({
          ...acc,
          [`${paramName}_word${i}`]: `%${word}%`,
        }),
        {},
      ),
      [`${paramName}_normalized_like`]: `%${normalizedSearch}%`,
    });
  }

  /**
   * Generates an abbreviation from a name by taking the first letter of each word.
   * Useful for creating short identifiers or display names.
   *
   * @param name - Input string to abbreviate
   * @returns Uppercase abbreviation string
   *
   * @example
   * ```typescript
   * SearchUtils.getAbbreviation('MacBook Pro')           // "MP"
   * SearchUtils.getAbbreviation('United States of America') // "USOA"
   * SearchUtils.getAbbreviation('iPhone 15 Pro Max')     // "IPM"
   * SearchUtils.getAbbreviation('  extra   spaces  ')    // "ES"
   * SearchUtils.getAbbreviation('')                      // ""
   * ```
   *
   * @remarks
   * - Filters out empty words (multiple spaces)
   * - Always returns uppercase letters
   * - Non-alphabetic first characters are preserved
   */
  static getAbbreviation(name: string): string {
    return name
      .split(' ')
      .filter((word) => word.length > 0) // Remove empty strings from multiple spaces
      .map((word) => word[0].toUpperCase()) // Take first letter of each word
      .join('');
  }
}
