import React, {useState, useEffect, useMemo} from "react";
import hash from 'object-hash';

const useSortableData = (initialItems, initialConfig = {key: 'severity', direction: 'ascending'}) => {
  const [sortConfig, setSortConfig] = React.useState(initialConfig);
  const [currentItems, setCurrentItems] = useState(initialItems);

  const getClassNamesFor = (name) => {
    if (!sortConfig) return;
    return sortConfig.key === name ? sortConfig.direction : undefined;
  };

  const sortedItems = useMemo(() => {
    let sortableItems = [...currentItems];

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aParsed, bParsed = '';

        if (sortConfig.key === 'identifier') {
          aParsed = a[sortConfig.key].toString().toLowerCase().trim();
          bParsed = b[sortConfig.key].toString().toLowerCase().trim();
        }
        else if (sortConfig.key === 'projectsAffected') {
          aParsed = a.projects.length;
          bParsed = b.projects.length;
        }
        else {
          let aProblem = a.problem[sortConfig.key];
          aParsed = aProblem.toString().toLowerCase().trim();

          let bProblem = b.problem[sortConfig.key];
          bParsed = bProblem.toString().toLowerCase().trim();
        }

        if (aParsed < bParsed) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aParsed > bParsed) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return sortableItems;
  }, [currentItems, sortConfig]);

  // useEffect(() => {
  //   if (hash(sortedItems) !== hash(currentItems)) {
  //       console.log('sortConfig: ', sortConfig);
  //       setCurrentItems(sortedItems);
  //       console.log('currentItems: ', currentItems);
  //   }
  // }, sortedItems, currentItems);

  if (hash(sortedItems) !== hash(currentItems)) {
    setCurrentItems(sortedItems);
  }

  const requestSort = (key) => {
    let direction = 'ascending';

    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }

    setCurrentItems(sortedItems);
    setSortConfig({ key, direction });

    return { sortedItems: currentItems };
  };

  return { sortedItems: currentItems, currentSortConfig: sortConfig, getClassNamesFor, requestSort };
};

export default useSortableData;