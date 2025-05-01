import * as React from "react";
import { useState, useEffect } from "react";
import styles from "./SqlCorporateDirectory.module.scss";
import type { ISqlCorporateDirectoryProps } from "./ISqlCorporateDirectoryProps";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { HttpClient } from "@microsoft/sp-http";

interface IPerson {
  FullName: string;
  JobTitle: string;
  Department: string;
  PhoneNumber: string;
  SecondaryPhone?: string;
  Supervisor?: string;
  Location: string;
  Initials?: string;
  ProfileColor?: string;
  [key: string]: any; // <-- Add this line
}

const SqlCorporateDirectory: React.FC<ISqlCorporateDirectoryProps> = ({ context }) => {
  const [people, setPeople] = useState<IPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPeople, setFilteredPeople] = useState<IPerson[]>([]);
  const [activeFilter, setActiveFilter] = useState<{ type: string; value: string }[]>(
    [{ type: "letter", value: "All" }]
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  function parseCSVRow(row: string): string[] {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        // Toggle quoting state, but don’t include the quote
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        // If we hit an unquoted comma, this is a column break
        cols.push(cur);
        cur = "";
      } else {
        // Otherwise keep accumulating
        cur += char;
      }
    }

    // Push last column
    cols.push(cur);
    return cols.map((c) => c.trim());
  }

  const fetchPeople = async (): Promise<void> => {
    try {
      const fileUrl = `${context.pageContext.web.absoluteUrl}/EmployeeDirectory/sample%20contact%20download.csv`;
      const response = await context.httpClient.get(fileUrl, HttpClient.configurations.v1);
      const raw = await response.text();

      // Split into lines, skip any empty lines or header
      const rows = raw
        .split(/\r?\n/)
        .filter((line, idx) => idx > 0 && line.trim().length > 0);

      const randomColors = [
        "#1ed552","#c0a464","#149a57","#c6e30d","#b2fad7","#5fb6b0","#b91959","#2d805b","#be8a6a","#d238cf",];

      const parsedPeople: IPerson[] = rows.map((row) => {
        const cols = parseCSVRow(row);

        const lastName = cols[0] || "";
        const firstName = cols[1] || "";
        const rawDisplayName = cols[2] || "";
        const jobTitle = cols[3] || "";
        const rawSupervisor = cols[4] || "";
        const primaryPhone = cols[5] || "";
        const secondaryPhone = cols[6] || "";

        // 1) DISPLAY NAME logic: if it contains a comma, use as-is;
        //    otherwise fall back to FirstName + " " + LastName
        const fullName = rawDisplayName.includes(",")
          ? rawDisplayName
          : rawDisplayName
            ? rawDisplayName
            : `${lastName}, ${firstName}`;

        // 2) SUPERVISOR logic: if it contains a comma, split and reorder
        let supervisor = rawSupervisor;
        if (supervisor.includes(",")) {
          const [supLast, supFirst] = supervisor.split(",").map((s) => s.trim());
          supervisor = `${supLast}, ${supFirst}`;
        }

        // 3) INITIALS
        const initials = `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase();

        // 4) PROFILE COLOR
        const profileColor = randomColors[Math.floor(Math.random() * randomColors.length)];

        return {
          FullName: fullName,
          JobTitle: jobTitle,
          PhoneNumber: primaryPhone,
          SecondaryPhone: secondaryPhone,
          Supervisor: supervisor,
          Initials: initials,
          ProfileColor: profileColor,
          Department: "",
          Location: "",
        };
      });

      setPeople(parsedPeople.filter((p) => p.FullName));
    } catch (error) {
      console.error("Error loading CSV data:", error);
    }
  };

  useEffect(() => {
    fetchPeople();
    // const intervalId = setInterval(fetchPeople, 30000);
    // return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    if (query) {
      setSearchTerm(query);
    }

    let filtered = [...people];

    activeFilter.forEach((filter) => {
      if (filter.type === "letter" && filter.value !== "All") {
        filtered = filtered.filter((person) =>
          person.FullName?.toLowerCase().startsWith(filter.value.toLowerCase())
        );
      } else if (filter.type === "JobTitle" && filter.value !== "All") {
        filtered = filtered.filter((person) => person.JobTitle === filter.value);
      }
    });

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();

      filtered = filtered.filter((person) =>
        person.FullName?.toLowerCase().includes(lowerSearch) ||
        person.JobTitle?.toLowerCase().includes(lowerSearch) ||
        person.Supervisor?.toLowerCase().includes(lowerSearch) ||
        person.PhoneNumber?.toLowerCase().includes(lowerSearch) ||
        person.SecondaryPhone?.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredPeople(filtered);
    setCurrentPage(1);
  }, [people, activeFilter, searchTerm]);


  const handleAlphabetFilterChange = (type: string, value: string) => {
    setSearchTerm("");
    if (value === "All") {
      // Reset activeFilter to only the "All" letter filter, clearing other filters
      setActiveFilter([{ type: "letter", value: "All" }]);
    } else {
      // Update or add the letter filter
      setActiveFilter((prevFilters) => {
        const letterFilterIndex = prevFilters.findIndex((filter) => filter.type === "letter");
        if (letterFilterIndex !== -1) {
          const newFilters = [...prevFilters];
          newFilters[letterFilterIndex] = { type, value };
          return newFilters;
        } else {
          return [...prevFilters, { type, value }];
        }
      });
    }
  };

  const handleJobTitleFilterChange = (type: string, value: string) => {
    setSearchTerm("");
    setActiveFilter((prevFilters) => {
      const jobTitleFilterIndex = prevFilters.findIndex((filter) => filter.type === "JobTitle");
      if (jobTitleFilterIndex !== -1) {
        const newFilters = [...prevFilters];
        newFilters[jobTitleFilterIndex] = { type, value };
        return newFilters;
      } else {
        return [...prevFilters, { type, value }];
      }
    });
  };

  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
  const paginatedData = filteredPeople.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const jobTitles: string[] = [
    ...new Set(people.map((p) => p.JobTitle?.trim()).filter((title) => title)), // remove empty or undefined
  ].sort((a, b) => a.localeCompare(b));

  return (
    <>
    <div className={styles.directoryTitle}>Employee Search</div>
    <div className={styles.directoryContainer}>
      <aside className={styles.sidebar}>
        {/* <FilterSection title="Department" options={departments} type="Department" activeFilter={activeFilter} handleFilterChange={handleFilterChange} /> */}
        <FilterSection
          title="Job Title"
          options={jobTitles}
          type="JobTitle"
          activeFilter={activeFilter.find((f) => f.type === "JobTitle")}
          handleFilterChange={handleJobTitleFilterChange} />
        {/* <FilterSection title="Location" options={locations} type="Location" activeFilter={activeFilter} handleFilterChange={handleFilterChange} /> */}
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search People..."
            className={styles.searchBox}
            value={searchTerm}
            onChange={(e) => {setSearchTerm(e.target.value);
              const url = new URL(window.location.href);
                url.searchParams.delete("q");
                window.history.replaceState({}, "", url.toString());
            }} />

          {searchTerm && (
            <span
              className={styles.clearSearch}
              onClick={() => {
                setSearchTerm("");

                // Create a URL object from the current href (which is a string)
                const url = new URL(window.location.href);
                url.searchParams.delete("q");
                window.history.replaceState({}, "", url.toString());
              } }
              title="Clear search"
            >
              &times;
            </span>
          )}
        </div>

        <AlphabetFilter
          activeFilter={activeFilter.find((f) => f.type === "letter")}
          handleFilterChange={handleAlphabetFilterChange} />

        <div className={styles.peopleGrid}>
          {paginatedData.map((person, index) => (
            <PersonCard key={index} person={person} />
          ))}
        </div>

        {paginatedData.length === 0 && <div className={styles.noResult}>No result found</div>}

        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={setCurrentPage} />
      </main>
    </div></>
  );
};
const truncateText = (text: string, maxLength: number) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

const PersonCard: React.FC<{ person: IPerson }> = ({ person }) => (
  <div className={styles.personCard}>
    <div className={styles.initials} style={{ backgroundColor: person.ProfileColor }}>
      {person.Initials}
    </div>

    <div className={styles.personDetails}>
      <h3>{person.FullName}</h3>
      <p className={styles.singleLine}>{truncateText(person.JobTitle, 30)}</p>
      {person.Supervisor && (
        <p className={styles.singleLine}>{truncateText(person.Supervisor, 30)}</p>
      )}

      {person.PhoneNumber && (
        <p className={styles.singleLine}>
          <FontAwesomeIcon icon={faPhone} />{" "}
          <a href={`tel:${person.PhoneNumber}`} className={styles.phoneLink}>
            {person.PhoneNumber}
          </a>
        </p>
      )}

      {person.SecondaryPhone && person.SecondaryPhone !== person.PhoneNumber && (
        <p className={styles.singleLine}>
          <FontAwesomeIcon icon={faPhone} />{" "}
          <a href={`tel:${person.SecondaryPhone}`} className={styles.phoneLink}>
            {person.SecondaryPhone}
          </a>
        </p>
      )}
    </div>
  </div>
);

interface FilterSectionProps {
  title: string;
  options: string[];
  type: string;
  activeFilter: { type: string; value: string } | undefined;
  handleFilterChange: (type: string, value: string) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  options,
  type,
  activeFilter,
  handleFilterChange,
}) => {
  const isActive = activeFilter?.type === type;

  const handleClear = () => {
    handleFilterChange(type, "All");
  };

  const handleButtonClick = (option: string) => {
    handleFilterChange(type, option); // Apply selected filter
  };

  return (
    <div className={styles.filterBox}>
      <h3>{title}</h3>
      {isActive && activeFilter?.value !== "All" && (
        <button className={styles.clearButton} onClick={handleClear}>
          Clear
        </button>
      )}
      <div className={styles.filterButtons}>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleButtonClick(option)}
            className={
              isActive && activeFilter?.value === option
                ? `${styles.filterButton} ${styles.active}`
                : styles.filterButton
            }
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

interface AlphabetFilterProps {
  activeFilter: { type: string; value: string } | undefined;
  handleFilterChange: (type: string, value: string) => void;
}

const AlphabetFilter: React.FC<AlphabetFilterProps> = ({
  activeFilter,
  handleFilterChange,
}) => {
  const alphabet = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
  return (
    <div className={styles.alphabetFilter}>
      {alphabet.map((letter) => (
        <button
          key={letter}
          onClick={() => handleFilterChange("letter", letter)}
          className={activeFilter?.type === "letter" && activeFilter?.value === letter ? styles.active : ""}
        >
          {letter}
        </button>
      ))}
    </div>
  );
};

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  totalPages,
  currentPage,
  onPageChange,
}) => {
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];

    pages.push(1);

    if (currentPage > 4) {
      pages.push("...");
    }

    const startPage = Math.max(2, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    if (currentPage < totalPages - 3) {
      pages.push("...");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div
      className={styles.pagination}
      style={{ display: totalPages > 0 ? "flex" : "none" }}
    >
      {currentPage > 1 && <button onClick={() => onPageChange(1)}>&laquo;</button>}
      {currentPage > 1 && <button onClick={() => onPageChange(currentPage - 1)}>&lt;</button>}

      {pageNumbers.map((page, index) =>
        page === "..." ? (
          <span key={`ellipsis-${index}`} className={styles.ellipsis}>
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(Number(page))}
            className={currentPage === page ? styles.active : ""}
          >
            {page}
          </button>
        )
      )}

      {currentPage < totalPages && (
        <button onClick={() => onPageChange(currentPage + 1)}>&gt;</button>
      )}
      {currentPage < totalPages && <button onClick={() => onPageChange(totalPages)}>&raquo;</button>}
    </div>
  );
};

export default SqlCorporateDirectory;