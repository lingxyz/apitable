import { Field, IField, KONVA_DATASHEET_ID, Strings, t, ViewType } from '@vikadata/core';
import { EditGanttDescribeFilled, IIconProps, MoreStandOutlined, WarningTriangleNonzeroFilled } from '@vikadata/icons';
import dynamic from 'next/dynamic';
import { generateTargetName } from 'pc/components/gantt_view';
import { autoSizerCanvas, Icon, Rect, Text } from 'pc/components/konva_components';
import { GRID_CELL_VALUE_PADDING, KonvaGridContext, FieldHeadIconType } from 'pc/components/konva_grid';
import { FC, memo, useContext, useMemo, useRef } from 'react';
import { 
  GRID_FIELD_HEAD_HEIGHT, 
  GRID_ICON_COMMON_SIZE, 
  GRID_ICON_SMALL_SIZE, 
  FIELD_HEAD_ICON_GAP_SIZE, 
  FIELD_HEAD_ICON_SIZE_MAP,
  FIELD_HEAD_TEXT_MIN_WIDTH
} from '../../constant';
import { FieldIcon } from './field_icon';

const Group = dynamic(() => import('pc/components/gantt_view/hooks/use_gantt_timeline/group'), { ssr: false });
interface IFieldHeadProps {
  x?: number;
  y?: number;
  width: number;
  height: number;
  field: IField;
  columnIndex: number;
  iconVisible: boolean; // 是否显示图标，鼠标移入时显示，否则隐藏
  permissionInfo?: (string | FC<IIconProps>)[] | null;
  isSelected: boolean;
  isHighlight: boolean;
  editable: boolean;
  autoHeadHeight: boolean;
  viewType: ViewType;
  stroke?: string;
  isFrozen?: boolean;
}

// IconPath
const MoreStandOutlinedPath = MoreStandOutlined.toString();
const EditDescribeFilledPath = EditGanttDescribeFilled.toString();
const WarningTriangleNonzeroFilledPath = WarningTriangleNonzeroFilled.toString();

export const FieldHead: FC<IFieldHeadProps> = memo((props) => {
  const {
    x = 0, y = 0, width, field, iconVisible, isSelected, height: headHeight,
    isHighlight, editable, stroke, permissionInfo, isFrozen, autoHeadHeight: _autoHeadHeight, viewType
  } = props;
  const { theme, setTooltipInfo, clearTooltipInfo } = useContext(KonvaGridContext);
  const textSizer = useRef(autoSizerCanvas);
  const colors = theme.color;
  const { 
    id: fieldId, 
    name: _fieldName, 
    desc 
  } = field;
  const moreVisible = editable && iconVisible;
  const descVisible = Boolean(desc);
  const permissionVisible = Boolean(permissionInfo);
  const hasError = Field.bindModel(field).isComputed && Field.bindModel(field).hasError;
  const textOffset = GRID_CELL_VALUE_PADDING + GRID_ICON_COMMON_SIZE + FIELD_HEAD_ICON_GAP_SIZE;
  const autoHeadHeight = _autoHeadHeight && headHeight !== GRID_FIELD_HEAD_HEIGHT;
  let availableTextWidth = width - (
    (autoHeadHeight || moreVisible) ? 
      2 * (GRID_CELL_VALUE_PADDING + GRID_ICON_COMMON_SIZE + FIELD_HEAD_ICON_GAP_SIZE) : 
      2 * GRID_CELL_VALUE_PADDING + GRID_ICON_COMMON_SIZE + FIELD_HEAD_ICON_GAP_SIZE
  );
  // 「默认列头高度」模式下，换行符转成空格完整显示
  const fieldName = _autoHeadHeight ? _fieldName : _fieldName.replace(/\r|\n/g, ' ');
  const isGanttNoWrap = viewType === ViewType.Gantt && !autoHeadHeight;

  const iconInfoList = useMemo(() => ([
    {
      type: FieldHeadIconType.Error,
      visible: hasError,
    },
    {
      type: FieldHeadIconType.Description,
      visible: descVisible,
    },
    {
      type: FieldHeadIconType.Permission,
      visible: permissionVisible,
    },
  ]), [descVisible, hasError, permissionVisible]);

  if (!autoHeadHeight) {
    iconInfoList.forEach(item => {
      const { type, visible } = item;
      if (!visible) return;
      availableTextWidth = availableTextWidth - FIELD_HEAD_ICON_SIZE_MAP[type] - FIELD_HEAD_ICON_GAP_SIZE;
    });
  }

  const textData = useMemo(() => {
    textSizer.current.setFont({ fontWeight: 'bold', fontSize: 13 });
    if (autoHeadHeight) {
      const { height, lastLineWidth } = textSizer.current.measureText(fieldName, Math.max(availableTextWidth, FIELD_HEAD_TEXT_MIN_WIDTH));
      return {
        width: Math.ceil(lastLineWidth),
        height,
        isOverflow: false,
      };
    }
    const { 
      width,
      height,
      isOverflow 
    } = textSizer.current.measureText(fieldName, availableTextWidth, 1);
    return {
      width: Math.min(width, availableTextWidth),
      height,
      isOverflow
    };
  }, [fieldName, availableTextWidth, autoHeadHeight]);

  const iconOffsetMap = useMemo(() => {
    const iconOffsetMap = {};
    const { width, height } = textData;
    let prevIconSize = 0;
    let curIconOffsetX = textOffset + width;
    let curIconOffsetY = autoHeadHeight ? height - 24 : 0;

    iconInfoList.forEach(item => {
      const { type, visible } = item;
      if (!visible) return;
      const curIconWidth = FIELD_HEAD_ICON_SIZE_MAP[type];
      const estimateOffsetX = curIconOffsetX + curIconWidth + FIELD_HEAD_ICON_GAP_SIZE;
      if (autoHeadHeight && estimateOffsetX > textOffset + availableTextWidth) {
        curIconOffsetX = textOffset;
        curIconOffsetY += 24;
      } else {
        curIconOffsetX = curIconOffsetX + prevIconSize + FIELD_HEAD_ICON_GAP_SIZE;
      }
      iconOffsetMap[type] = {
        x: curIconOffsetX,
        y: curIconOffsetY
      };
      prevIconSize = curIconWidth;
    });
    return iconOffsetMap;
  }, [autoHeadHeight, iconInfoList, textData, textOffset, availableTextWidth]);

  const onTooltipShown = (title: string, iconSize: number, offsetX: number, offsetY?: number) => {
    return setTooltipInfo({
      title,
      visible: true,
      width: iconSize,
      height: iconSize,
      x: x + offsetX,
      y: offsetY ?? 10,
      coordXEnable: !isFrozen,
      coordYEnable: false,
    });
  };

  const commonIconOffsetY = autoHeadHeight ? 8 : (headHeight - GRID_ICON_COMMON_SIZE) / 2;
  const smallIconOffsetY = autoHeadHeight ? 10 : (headHeight - GRID_ICON_SMALL_SIZE) / 2;

  return (
    <Group
      x={x}
      y={y}
    >
      <Rect
        x={0.5}
        y={0.5}
        name={generateTargetName({
          targetName: KONVA_DATASHEET_ID.GRID_FIELD_HEAD,
          fieldId,
        })}
        width={width}
        height={headHeight}
        fill={isSelected ? colors.cellSelectedColorSolid : colors.defaultBg}
        stroke={stroke || colors.sheetLineColor}
        strokeWidth={1}
        onMouseEnter={() => {
          if (!textData.isOverflow) return;
          onTooltipShown(fieldName, GRID_ICON_SMALL_SIZE, (width - GRID_ICON_SMALL_SIZE) / 2);
        }}
        onMouseOut={clearTooltipInfo}
      />
      <FieldIcon
        fieldType={field.type}
        x={GRID_CELL_VALUE_PADDING}
        y={autoHeadHeight ? 8 : (headHeight - GRID_ICON_COMMON_SIZE) / 2}
        width={GRID_ICON_COMMON_SIZE}
        height={GRID_ICON_COMMON_SIZE}
        fill={isHighlight ? colors.primaryColor : colors.secondLevelText}
      />
      <Text
        x={textOffset}
        y={autoHeadHeight ? 5 : (isGanttNoWrap ? (headHeight - GRID_FIELD_HEAD_HEIGHT) / 2 : undefined)}
        width={Math.max(autoHeadHeight ? availableTextWidth : textData.width, FIELD_HEAD_TEXT_MIN_WIDTH)}
        height={isGanttNoWrap ? GRID_FIELD_HEAD_HEIGHT : headHeight + 2}
        text={fieldName}
        wrap={autoHeadHeight ? 'char' : 'none'}
        fontStyle={'bold'}
        lineHeight={1.84}
        verticalAlign={autoHeadHeight ? 'top' : 'middle'}
        fill={isHighlight ? colors.primaryColor : colors.firstLevelText}
        ellipsis={!autoHeadHeight}
      />
      {
        hasError &&
        <Icon
          name={generateTargetName({
            targetName: KONVA_DATASHEET_ID.GRID_FIELD_HEAD,
            fieldId,
            mouseStyle: 'pointer'
          })}
          x={iconOffsetMap[FieldHeadIconType.Error].x}
          y={iconOffsetMap[FieldHeadIconType.Error].y + commonIconOffsetY}
          size={GRID_ICON_COMMON_SIZE}
          data={WarningTriangleNonzeroFilledPath}
          fill={colors.warningColor}
          background={isSelected ? colors.cellSelectedColorSolid : colors.defaultBg}
          onMouseEnter={() => onTooltipShown(
            t(Strings.field_configuration_err), 
            GRID_ICON_COMMON_SIZE, 
            iconOffsetMap[FieldHeadIconType.Error].x, 
            iconOffsetMap[FieldHeadIconType.Error].y + commonIconOffsetY
          )}
          onMouseOut={clearTooltipInfo}
        />
      }
      {
        descVisible &&
        <Icon
          name={generateTargetName({
            targetName: KONVA_DATASHEET_ID.GRID_FIELD_HEAD_DESC,
            fieldId,
          })}
          x={iconOffsetMap[FieldHeadIconType.Description].x}
          y={iconOffsetMap[FieldHeadIconType.Description].y + smallIconOffsetY}
          size={GRID_ICON_COMMON_SIZE}
          shape={'circle'}
          data={EditDescribeFilledPath}
          fill={colors.primaryColor}
          background={colors.rc01}
          backgroundWidth={GRID_ICON_SMALL_SIZE}
          backgroundHeight={GRID_ICON_SMALL_SIZE}
          opacity={0.2}
          onMouseEnter={() => onTooltipShown(
            desc || '', 
            GRID_ICON_SMALL_SIZE, 
            iconOffsetMap[FieldHeadIconType.Description].x, 
            iconOffsetMap[FieldHeadIconType.Description].y + smallIconOffsetY
          )}
          onMouseOut={clearTooltipInfo}
        />
      }
      {
        permissionVisible &&
        <Icon
          name={generateTargetName({
            targetName: KONVA_DATASHEET_ID.GRID_FIELD_HEAD,
            fieldId,
            mouseStyle: 'pointer'
          })}
          x={iconOffsetMap[FieldHeadIconType.Permission].x}
          y={iconOffsetMap[FieldHeadIconType.Permission].y + commonIconOffsetY}
          size={GRID_ICON_COMMON_SIZE}
          data={permissionInfo?.[0].toString()}
          fill={isSelected ? colors.primaryColor : colors.thirdLevelText}
          background={isSelected ? colors.cellSelectedColorSolid : colors.defaultBg}
          backgroundWidth={GRID_ICON_COMMON_SIZE}
          backgroundHeight={GRID_ICON_COMMON_SIZE}
          onMouseEnter={() => onTooltipShown(
            permissionInfo?.[1] as string || '', 
            GRID_ICON_COMMON_SIZE, 
            iconOffsetMap[FieldHeadIconType.Permission].x,
            iconOffsetMap[FieldHeadIconType.Permission].y + commonIconOffsetY
          )}
          onMouseOut={clearTooltipInfo}
        />
      }
      {
        moreVisible &&
        <Icon
          name={generateTargetName({
            targetName: KONVA_DATASHEET_ID.GRID_FIELD_HEAD_MORE,
            fieldId,
          })}
          x={width - GRID_CELL_VALUE_PADDING - GRID_ICON_COMMON_SIZE}
          y={commonIconOffsetY}
          data={MoreStandOutlinedPath}
          fill={(isSelected || isHighlight) ? colors.primaryColor : colors.fourthLevelText}
          background={isSelected ? colors.cellSelectedColorSolid : colors.defaultBg}
          backgroundWidth={GRID_ICON_COMMON_SIZE}
          backgroundHeight={GRID_ICON_COMMON_SIZE}
        />
      }
      {
        isHighlight &&
        <Rect
          x={1}
          width={width - 1}
          height={2}
          fill={colors.primaryColor}
          listening={false}
        />
      }
    </Group>
  );
});
