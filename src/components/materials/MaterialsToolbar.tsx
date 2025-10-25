import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Tabs,
  Tab,
  Chip,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import {getMaterialTags} from "../../services/api";

export type MaterialType = 'all' | 'listening' | 'reading' | 'grammar';
export type ViewMode = 'list' | 'grid';

interface MaterialsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedType: MaterialType;
  onTypeChange: (type: MaterialType) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onAddMaterial: () => void;
}

const MaterialsToolbar: React.FC<MaterialsToolbarProps> = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedType,
  onTypeChange,
  selectedTags,
  onTagsChange,
  onAddMaterial,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode | null
  ) => {
    if (newViewMode !== null) {
      onViewModeChange(newViewMode);
    }
  };

  const handleTypeChange = (event: React.SyntheticEvent, newValue: MaterialType) => {
    onTypeChange(newValue);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  // State for tags
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Fetch tags from API
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getMaterialTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Failed to fetch tags', error);
      }
    };

    fetchTags();
  }, []);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Material type tabs */}
      <Box 
        sx={{ 
          borderBottom: '1px solid',
          borderColor: 'divider', 
          mb: 2,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: (theme) => theme.palette.divider,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }
        }}
      >
        <Tabs 
          value={selectedType} 
          onChange={handleTypeChange}
          aria-label="material types"
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : undefined}
          TabIndicatorProps={{
            sx: { backgroundColor: 'primary.main' }
          }}
        >
          <Tab label="All Materials" value="all" />
          <Tab label="Listening" value="listening" />
          <Tab label="Grammar" value="grammar" />
        </Tabs>
      </Box>

      {/* Search and filters row */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 2,
        gap: 2
      }}>
        {/* Search field */}
        <TextField
          placeholder="Search by title"
          variant="outlined"
          fullWidth
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1, maxWidth: { sm: '300px' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* View toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="list" aria-label="list view">
              <ListIcon />
            </ToggleButton>
            <ToggleButton value="grid" aria-label="grid view">
              <GridIcon />
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Add material button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onAddMaterial}
            size={isMobile ? "small" : "medium"}
          >
            {isMobile ? "Add" : "Add Material"}
          </Button>
        </Box>
      </Box>

      {/* Tags filter */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        <Tooltip title="Filter by tags">
          <IconButton size="small" sx={{ mr: 1 }}>
            <FilterIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {availableTags.map(tag => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            onClick={() => handleTagClick(tag)}
            color={selectedTags.includes(tag) ? "primary" : "default"}
            variant={selectedTags.includes(tag) ? "filled" : "outlined"}
          />
        ))}
      </Box>
    </Box>
  );
};

export default MaterialsToolbar;
