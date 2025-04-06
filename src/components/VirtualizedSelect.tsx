import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { components, MenuListProps } from 'react-select';

const ITEM_HEIGHT = 40;

const MenuList = ({ children, ...props }: MenuListProps) => {
  const { options } = props;
  if (!Array.isArray(children)) {
    return <components.MenuList {...props}>{children}</components.MenuList>;
  }

  return (
    <List
      height={Math.min(400, children.length * ITEM_HEIGHT)}
      itemCount={children.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          {children[index]}
        </div>
      )}
    </List>
  );
};

export const customStyles = {
  menu: (provided: any) => ({
    ...provided,
    zIndex: 9999,
  }),
  menuPortal: (provided: any) => ({
    ...provided,
    zIndex: 9999
  }),
  control: (provided: any) => ({
    ...provided,
    minHeight: '38px'
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isFocused ? '#EEF2FF' : 'white',
    color: state.isFocused ? '#4F46E5' : '#111827',
    cursor: 'pointer',
    padding: '8px 12px',
    height: ITEM_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '8px 12px',
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: '#EEF2FF',
    borderRadius: '4px',
    margin: '2px',
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: '#4F46E5',
    padding: '2px 6px',
    fontSize: '0.875rem',
    maxWidth: '180px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: '#4F46E5',
    ':hover': {
      backgroundColor: '#E0E7FF',
      color: '#4338CA',
    },
  }),
  container: (provided: any) => ({
    ...provided,
    width: '100%',
  }),
  menuList: (provided: any) => ({
    ...provided,
    maxHeight: '400px',
  }),
};

export const selectComponents = {
  MenuList,
  Option: ({ children, ...props }: any) => {
    // For medication options
    if (props.data.commercial_name) {
      const label = `${props.data.commercial_name} - ${props.data.form} ${props.data.dosage}${props.data.COND ? ` (${props.data.COND})` : ''}${props.data.laboratory ? ` | ${props.data.laboratory}` : ''}`;
      return (
        <components.Option {...props}>
          <div className="truncate" title={label}>
            {label}
          </div>
        </components.Option>
      );
    }
    
    // For wilaya options
    return (
      <components.Option {...props}>
        <div className="truncate" title={props.data.label}>
          {props.data.label}
        </div>
      </components.Option>
    );
  },
  MultiValueLabel: ({ children, ...props }: any) => (
    <components.MultiValueLabel {...props}>
      <span className="truncate" title={children}>
        {children}
      </span>
    </components.MultiValueLabel>
  ),
  SingleValue: ({ children, ...props }: any) => {
    // For medication options
    if (props.data.commercial_name) {
      const label = `${props.data.commercial_name} - ${props.data.form} ${props.data.dosage}${props.data.COND ? ` (${props.data.COND})` : ''}${props.data.laboratory ? ` | ${props.data.laboratory}` : ''}`;
      return (
        <components.SingleValue {...props}>
          <span className="truncate" title={label}>
            {label}
          </span>
        </components.SingleValue>
      );
    }
    
    // For other options
    return (
      <components.SingleValue {...props}>
        <span className="truncate" title={children}>
          {children}
        </span>
      </components.SingleValue>
    );
  }
};