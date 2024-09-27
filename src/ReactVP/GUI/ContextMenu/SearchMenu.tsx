import React, { useState, useMemo, useCallback } from 'react';
import type NodeSpec from '../../Spec/NodeSpec';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon } from '../../Style';

interface ISearchMenuProps {
  nodeSpecs: NodeSpec[];
  onSelectNodeSpec: (spec: NodeSpec) => void;
}

const SearchMenu: React.FC<ISearchMenuProps> = ({
  nodeSpecs,
  onSelectNodeSpec
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);

  const categorizeNodes = useCallback(() => {
    const categories: Record<string, any[]> = {};
    nodeSpecs.forEach(spec => {
      const category = spec.category ?? 'Uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(spec);
    });
    return categories;
  }, [nodeSpecs]);

  const searchAllNodes = useCallback(
    (
      categories: Record<string, any[]>,
      query: string
    ): Record<string, any[]> => {
      const lowerQuery = query.toLowerCase();
      const results: Record<string, any[]> = {};

      Object.entries(categories).forEach(([category, nodes]) => {
        const matchingNodes = nodes.filter(
          spec =>
            spec.displayLabel?.toLowerCase().includes(lowerQuery) ||
            spec.description?.toLowerCase().includes(lowerQuery)
        );

        if (
          category.toLowerCase().includes(lowerQuery) ||
          matchingNodes.length > 0
        ) {
          results[category] = category.toLowerCase().includes(lowerQuery)
            ? nodes
            : matchingNodes;
        }
      });

      return results;
    },
    []
  );

  const { categorizedSpecs, expandedCategories } = useMemo(() => {
    const allCategories = categorizeNodes();

    if (!searchQuery) {
      return { categorizedSpecs: allCategories, expandedCategories: [] };
    }

    const searchResults = searchAllNodes(allCategories, searchQuery);
    return {
      categorizedSpecs: searchResults,
      expandedCategories: Object.keys(searchResults)
    };
  }, [nodeSpecs, searchQuery, categorizeNodes, searchAllNodes]);

  useMemo(() => {
    const newExpandedIndexes = expandedCategories.map((_, index) => index);
    setExpandedIndexes(newExpandedIndexes);
  }, [expandedCategories]);

  if (!nodeSpecs || nodeSpecs.length === 0) {
    return <p>No node specifications available.</p>;
  }

  const handleAccordionChange = (index: number): void => {
    setExpandedIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="search-menu">
      <div className="search-input-container">
        <div className="search-icon">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
          }}
          className="search-input"
        />
        {searchQuery.length > 0 && (
          <button
            className="clear-search"
            onClick={() => {
              setSearchQuery('');
            }}
          >
            ×
          </button>
        )}
      </div>
      <div className="accordion">
        {Object.entries(categorizedSpecs).map(
          ([category, specs], categoryIndex) => (
            <div key={category} className="accordion-item">
              <button
                className="accordion-button"
                onClick={() => {
                  handleAccordionChange(categoryIndex);
                }}
              >
                {category}
                <span className="accordion-icon">
                  {expandedIndexes.includes(categoryIndex) ? (
                    <ChevronUpIcon />
                  ) : (
                    <ChevronDownIcon />
                  )}
                </span>
              </button>
              {expandedIndexes.includes(categoryIndex) && (
                <div className="accordion-panel">
                  <ul className="node-list">
                    {specs.map((spec, index) => (
                      <li
                        key={index}
                        onClick={() => {
                          onSelectNodeSpec(spec);
                        }}
                        className="node-item"
                        title={spec.description}
                      >
                        {spec.displayLabel}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SearchMenu;
