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
  Select,
  MenuItem,
  FormControl,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { getMaterialTags } from '../../services/api';
import type { MaterialSortOption, MaterialToolbarType } from './materialsViewConfig';

export type MaterialType = MaterialToolbarType;
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
  selectedSort: MaterialSortOption;
  onSortChange: (sort: MaterialSortOption) => void;
  onAddMaterial: () => void;
  onClearFilters?: () => void;
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
  selectedSort,
  onSortChange,
  onAddMaterial,
  onClearFilters,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newViewMode: ViewMode | null) => {
    if (newViewMode !== null) {
      onViewModeChange(newViewMode);
    }
  };

  const handleTypeChange = (_event: React.SyntheticEvent, newValue: MaterialType) => {
    onTypeChange(newValue);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const [availableTags, setAvailableTags] = useState<string[]>([]);

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
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Tabs
          value={selectedType}
          onChange={handleTypeChange}
          aria-label="material types"
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{ sx: { backgroundColor: 'primary.main' } }}
        >
          <Tab label="All" value="all" />
          <Tab label="Video" value="video" />
          <Tab label="Audio" value="audio" />
          <Tab label="Documents" value="document" />
          <Tab label="Grammar" value="grammar" />
          <Tab label="Listening" value="listening" />
        </Tabs>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          mb: 2,
          gap: 1.5,
        }}
      >
        <TextField
          placeholder="Search by title"
          variant="outlined"
          fullWidth
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1, maxWidth: { md: 360 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          inputProps={{ 'aria-label': 'Search learning materials' }}
        />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value as MaterialSortOption)}
              inputProps={{ 'aria-label': 'Sort materials' }}
            >
              <MenuItem value="title_asc">Title A-Z</MenuItem>
              <MenuItem value="title_desc">Title Z-A</MenuItem>
              <MenuItem value="type_asc">Type</MenuItem>
            </Select>
          </FormControl>

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

          {onClearFilters && (
            <Button variant="text" onClick={onClearFilters}>
              Reset
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onAddMaterial}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? 'Add' : 'Add Material'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
          <FilterIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            Tags
          </Typography>
        </Box>

        {availableTags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            onClick={() => handleTagClick(tag)}
            color={selectedTags.includes(tag) ? 'primary' : 'default'}
            variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
          />
        ))}
      </Box>
    </Box>
  );
};

export default MaterialsToolbar;
