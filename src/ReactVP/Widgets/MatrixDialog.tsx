import { useState, useEffect, useCallback, useMemo } from 'react';
import * as ReactDOM from 'react-dom/client';
import { type WidgetProps } from './Widget';
import { createPortal } from 'react-dom';
import { NumberInput } from './Input';
import { CloseIcon } from '../Style';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';
import { GridImageGallery } from './GridImageGallery';

interface IMatrixDialogProps extends WidgetProps {
  onClose: () => void;
}

// Parameter types and configurations
interface IParamConfig {
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

// Enhanced parameter data structure
interface IParameter {
  id: string;
  name: string;
  value: number | string | string[];
  type: string;
  readOnly?: boolean;
  config: IParamConfig;
  originalConfig?: { hasSlider: boolean };
  displayValue?: string;
}

// Function to open the matrix dialog from anywhere in the application
export function openMatrixDialog(editorContext: any): void {
  if (!editorContext || !editorContext.graph) {
    alert('No workflow exists. Please create a workflow first.');
    return;
  }

  const container = document.createElement('div');
  container.id = 'matrix-dialog-container';
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  const identifier = {
    nodeID: 'matrix',
    id: `matrix_${Date.now()}`,
    type: 'matrix'
  };

  const handleClose = () => {
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  };

  root.render(
    <MatrixDialog
      forWhom={identifier}
      editorContext={editorContext}
      onClose={handleClose}
      setValue={(_, updatedParameterMatrix) => {
        if (editorContext) {
          (editorContext as any).appliedParameterMatrix =
            updatedParameterMatrix;
          if (editorContext.graph && editorContext.updateGraph) {
            editorContext.updateGraph(editorContext.graph);
          }
        }
      }}
    />
  );
}

// Component for numeric inputs with range slider
function NumericParameterInput({
  param,
  onChange,
  onConfigChange
}: {
  param: IParameter;
  onChange: (value: number) => void;
  onConfigChange: (configKey: keyof IParamConfig, value: number) => void;
}) {
  const [value, setValue] = useState<number>(param.value as number);
  const [isEditing, setIsEditing] = useState(false);

  // Check if min and max are both defined in the original parameter,
  // not just from dialog configuration
  const hasDefinedRange =
    param.config.min !== undefined &&
    param.config.max !== undefined &&
    param.originalConfig?.hasSlider === true; // Only use slider if it was originally defined with a slider

  // Default range values if specified
  const min = param.config.min;
  const max = param.config.max;
  const step = param.config.step !== undefined ? param.config.step : 1;

  // Validate and constrain value when min/max change
  useEffect(() => {
    let newValue = value;
    // Apply constraints if they exist
    if (min !== undefined && newValue < min) {
      newValue = min;
    }
    if (max !== undefined && newValue > max) {
      newValue = max;
    }
    // Update if constraints changed the value
    if (newValue !== value) {
      setValue(newValue);
      onChange(newValue);
    }
  }, [min, max, value, onChange]);

  const handleRangeChange = (newValue: number[]) => {
    if (newValue.length > 0) {
      setValue(newValue[0]);
      onChange(newValue[0]);
    }
  };

  const handleInputChange = (_: any, newValue: number) => {
    let constrainedValue = newValue;

    // Apply constraints if they exist
    if (min !== undefined && constrainedValue < min) {
      constrainedValue = min;
    }
    if (max !== undefined && constrainedValue > max) {
      constrainedValue = max;
    }
    setValue(constrainedValue);
    onChange(constrainedValue);
  };

  // Toggle between slider and input configuration when range is defined
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // These are the range configuration controls shared between modes
  const rangeConfigControls = (
    <>
      <div className="range-config-row">
        <label>Min:</label>
        <NumberInput
          forWhom={{
            id: `${param.id}_min`,
            type: 'config',
            nodeID: 'matrix'
          }}
          value={min !== undefined ? min : 0}
          setValue={(_, val) => {
            // Ensure min ≤ max if max is defined
            let newMin = val;
            if (max !== undefined && val > max) {
              newMin = max;
            }
            onConfigChange('min', newMin);

            // Force re-render with updated range
            if (newMin > value) {
              setValue(newMin);
              onChange(newMin);
            }
          }}
        />
      </div>
      <div className="range-config-row">
        <label>Max:</label>
        <NumberInput
          forWhom={{
            id: `${param.id}_max`,
            type: 'config',
            nodeID: 'matrix'
          }}
          value={max !== undefined ? max : 5}
          setValue={(_, val) => {
            // Ensure max ≥ min if min is defined
            let newMax = val;
            if (min !== undefined && val < min) {
              newMax = min;
            }
            onConfigChange('max', newMax);

            // Force re-render with updated range
            if (newMax < value) {
              setValue(newMax);
              onChange(newMax);
            }
          }}
        />
      </div>
      <div className="range-config-row">
        <label>Step:</label>
        <NumberInput
          forWhom={{
            id: `${param.id}_step`,
            type: 'config',
            nodeID: 'matrix'
          }}
          value={step}
          setValue={(_, val) => {
            onConfigChange('step', val > 0 ? val : 0.01);
          }}
        />
      </div>
    </>
  );

  return (
    <div className="parameter-input-container">
      {hasDefinedRange ? (
        // When min and max are defined, show slider with toggle for range config
        isEditing ? (
          <div className="range-config">
            {rangeConfigControls}
            <button className="config-done-button" onClick={toggleEditMode}>
              Done
            </button>
          </div>
        ) : (
          <div className="parameter-value-controls">
            {hasDefinedRange && min !== undefined && max !== undefined && (
              <div className="slider-container">
                <RangeSlider
                  className="matrix-range-slider"
                  value={[value]}
                  min={min}
                  max={max}
                  step={step}
                  onInput={handleRangeChange}
                />
              </div>
            )}
            <div className="input-with-config">
              <NumberInput
                forWhom={{ id: param.id, type: 'value', nodeID: 'matrix' }}
                value={value}
                setValue={handleInputChange}
                min={min}
                max={max}
                step={step}
              />
              <button
                className="config-button"
                onClick={toggleEditMode}
                title="Configure range"
              >
                ⚙️
              </button>
            </div>
          </div>
        )
      ) : (
        // When either min or max is not defined, directly show range config
        <div className="range-config no-toggle">{rangeConfigControls}</div>
      )}
    </div>
  );
}

// Component for enum/option inputs
function EnumParameterInput({
  param,
  onChange
}: {
  param: IParameter;
  onChange: (value: string[]) => void;
}) {
  const options = param.config.options || [];
  // Initialize selected values as an array
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    // Convert existing value to array if it's a string, or use empty array
    if (typeof param.value === 'string') {
      return param.value ? [param.value] : [];
    }
    // If it's already an array, use it
    return Array.isArray(param.value) ? param.value : [];
  });

  useEffect(() => {
    // When options change, ensure at least one option is selected if none already
    if (options.length > 0 && selectedValues.length === 0) {
      setSelectedValues([options[0]]);
      onChange([options[0]]);
    }
  }, [options, selectedValues, onChange]);

  const handleOptionClick = (option: string) => {
    let newSelectedValues: string[];

    if (selectedValues.includes(option)) {
      // If already selected, remove it (unless it's the last one)
      if (selectedValues.length > 1) {
        newSelectedValues = selectedValues.filter(val => val !== option);
      } else {
        // Don't allow deselecting the last option
        return;
      }
    } else {
      newSelectedValues = [...selectedValues, option];
    }

    setSelectedValues(newSelectedValues);
    onChange(newSelectedValues);
  };

  return (
    <div className="enum-input-container">
      {options.length > 0 ? (
        <div className="options-list">
          {options.map(option => (
            <button
              key={option}
              className={`option-button ${selectedValues.includes(option) ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="no-options">No options available</div>
      )}
    </div>
  );
}

function ReadOnlyInput({ param }: { param: IParameter }) {
  return (
    <div className="readonly-input-container">
      <div className="readonly-value">
        {typeof param.value === 'object'
          ? JSON.stringify(param.value)
          : String(param.value)}
      </div>
    </div>
  );
}

const MatrixDialogPortal = ({
  children,
  onClose
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) => {
  return createPortal(
    <div
      className="matrix-dialog-overlay"
      onClick={e => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default function MatrixDialog({
  setValue, // This is for applying the whole matrix, not for gallery selection
  forWhom,
  onClose,
  editorContext
}: IMatrixDialogProps): JSX.Element {
  const [nodeParameters, setNodeParameters] = useState<
    Array<{
      nodeId: string;
      nodeLabel: string;
      parameters: Array<IParameter>;
    }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [processingMatrix, setProcessingMatrix] = useState(false);
  const [selectedGalleryImageParams, setSelectedGalleryImageParams] =
    useState<Record<string, any> | null>(null);
  const [matrixResults, setMatrixResults] = useState<
    Array<{
      imageUrl: string;
      index: number;
      params: Record<string, Record<string, any>>;
      error?: string;
    }>
  >([]);
  const [totalCombinations, setTotalCombinations] = useState<number>(0);
  const [processedCombinations, setProcessedCombinations] = useState<number>(0);

  // Register this component with the editorContext to receive matrix results
  useEffect(() => {
    if (editorContext) {
      // Handle receiving matrix results from VPWidget
      const matrixResultsHandler = (results: any) => {
        if (
          results &&
          results.type === 'matrix_results' &&
          Array.isArray(results.results)
        ) {
          setMatrixResults(results.results);
          setProcessingMatrix(false);
          setProcessedCombinations(results.results.length);
          if (results.total_combinations) {
            setTotalCombinations(results.total_combinations);
          }
        } else if (results && results.type === 'error') {
          setProcessingMatrix(false);
        }
      };

      // Register the handler with editorContext
      editorContext.matrixResultsHandler = matrixResultsHandler;

      // Cleanup function
      return () => {
        if (editorContext.matrixResultsHandler === matrixResultsHandler) {
          editorContext.matrixResultsHandler = undefined;
        }
      };
    }
  }, [editorContext]);

  // Collect all node parameters except images
  useEffect(() => {
    if (!editorContext || !editorContext.graph || !editorContext.graph.nodes) {
      setNodeParameters([]); // Clear parameters if no graph or nodes
      setLoading(false);
      return;
    }

    const rawNodes = editorContext.graph.nodes; // Always use the raw graph nodes for UI listing
    const localNodesWithParams: Array<{
      nodeId: string;
      nodeLabel: string;
      parameters: Array<IParameter>;
    }> = [];

    rawNodes.forEach(node => {
      const params: Array<IParameter> = [];
      if (node.data.inputs) {
        node.data.inputs.forEach((input: any) => {
          if (
            input.type &&
            typeof input.type === 'string' &&
            !input.type.toLowerCase().includes('image')
          ) {
            if (input.type === 'number') {
              params.push({
                id: `${node.id}_input_${input.id}`,
                name: input.name || input.id,
                value:
                  input.widget?.value !== undefined
                    ? input.widget.value
                    : input.defaultValue !== undefined
                      ? input.defaultValue
                      : 0,
                type: 'number',
                config: {
                  min:
                    input.widget?.min !== undefined
                      ? input.widget.min
                      : undefined,
                  max:
                    input.widget?.max !== undefined
                      ? input.widget.max
                      : undefined,
                  step:
                    input.widget?.step !== undefined ? input.widget.step : 1,
                  options: undefined
                },
                originalConfig: { hasSlider: input.widget?.hasSlider === true }
              });
            } else if (input.type === 'enum') {
              params.push({
                id: `${node.id}_input_${input.id}`,
                name: input.name || input.id,
                value:
                  input.widget?.value !== undefined
                    ? input.widget.value
                    : input.defaultValue !== undefined
                      ? input.defaultValue
                      : '',
                type: 'enum',
                config: {
                  options: input.widget?.options || []
                },
                originalConfig: { hasSlider: input.widget?.hasSlider === true }
              });
            } else {
              params.push({
                id: `${node.id}_input_${input.id}`,
                name: input.name || input.id,
                value:
                  input.widget?.value !== undefined
                    ? input.widget.value
                    : input.defaultValue !== undefined
                      ? input.defaultValue
                      : '',
                type: input.type,
                readOnly: true,
                config: {},
                originalConfig: { hasSlider: false }
              });
            }
          }
        });
      }

      if (params.length > 0) {
        localNodesWithParams.push({
          nodeId: node.id,
          nodeLabel: node.data.displayLabel || `Node ${node.id}`,
          parameters: params
        });
      }
    });

    // Check workflow readiness and add an info message if needed, but still show parameters
    const isWorkflowValid = editorContext.checkExecutionReadiness?.();
    if (!isWorkflowValid) {
      const infoMessage =
        localNodesWithParams.length > 0
          ? 'Note: Workflow may not be ready for full execution'
          : 'Note: Workflow is not ready for execution, and no parameters found.';

      setNodeParameters([
        {
          nodeId: 'info',
          nodeLabel: infoMessage,
          parameters: []
        },
        ...localNodesWithParams
      ]);
    } else {
      setNodeParameters(localNodesWithParams);
    }

    setLoading(false);
  }, [editorContext]);

  const handleValueChange = useCallback(
    (nodeId: string, paramId: string, newValue: number | string | string[]) => {
      setNodeParameters(prevNodes =>
        prevNodes.map(node => {
          if (node.nodeId === nodeId) {
            return {
              ...node,
              parameters: node.parameters.map(param => {
                if (param.id === paramId) {
                  return { ...param, value: newValue };
                }
                return param;
              })
            };
          }
          return node;
        })
      );
    },
    []
  );

  const handleParamConfigChange = useCallback(
    (
      nodeId: string,
      paramId: string,
      configKey: keyof IParamConfig,
      configValue: number
    ) => {
      setNodeParameters(prevNodes =>
        prevNodes.map(node => {
          if (node.nodeId === nodeId) {
            return {
              ...node,
              parameters: node.parameters.map(param => {
                if (param.id === paramId) {
                  // Create a new config object to avoid direct mutation
                  const newConfig = {
                    ...param.config,
                    [configKey]: configValue
                  };
                  return { ...param, config: newConfig };
                }
                return param;
              })
            };
          }
          return node;
        })
      );
    },
    []
  );

  // Convert the collected parameters to a matrix for execution
  const buildParameterMatrix = useCallback(() => {
    const parameterMatrix: Record<string, Record<string, any>> = {};

    nodeParameters.forEach(node => {
      if (node.parameters.length === 0 || node.nodeId === 'info') {
        return;
      }

      parameterMatrix[node.nodeId] = {};

      node.parameters.forEach(param => {
        if (param.readOnly) {
          return;
        }

        const paramId = param.id.split('_').pop() || param.id;

        if (param.type === 'number') {
          const configMin = param.config.min;
          const configMax = param.config.max;
          // param.config.step could be undefined per interface, default to 1 if so.
          const stepToUse =
            param.config.step !== undefined && param.config.step > 0
              ? param.config.step
              : 1;

          // Determine effective min, max to use for range generation.
          // Defaults match NumericParameterInput's displayed defaults if config is undefined.
          const effectiveMin = configMin !== undefined ? configMin : 0;
          // Use 5 as the default max, aligning with your UI default for NumericParameterInput
          const effectiveMax = configMax !== undefined ? configMax : 5;

          const values = [];
          // Only iterate if min <= max and step is valid
          if (effectiveMin <= effectiveMax && stepToUse > 0) {
            for (
              let val = effectiveMin;
              val <= effectiveMax;
              val += stepToUse
            ) {
              values.push(parseFloat(val.toFixed(5)));
            }
          }

          if (values.length > 0) {
            // If the range generation resulted in values, use them.
            // If only one value, send it as a single item, otherwise as an array.
            parameterMatrix[node.nodeId][paramId] =
              values.length > 1 ? values : values[0];
          } else {
            // If range generation produced no values (e.g., min > max, or step made it miss),
            // fall back to the parameter's current single value.
            parameterMatrix[node.nodeId][paramId] = param.value;
          }
        } else {
          // For non-numeric types (e.g., enum), use the current value.
          parameterMatrix[node.nodeId][paramId] = param.value;
        }
      });

      // Remove empty nodes
      if (Object.keys(parameterMatrix[node.nodeId]).length === 0) {
        delete parameterMatrix[node.nodeId];
      }
    });

    return parameterMatrix;
  }, [nodeParameters]);

  // Execute with matrix parameters
  const executeMatrixCode = useCallback(async () => {
    setProcessingMatrix(true);
    setMatrixResults([]);
    setProcessedCombinations(0);

    // Build the parameter matrix
    const parameterMatrix = buildParameterMatrix();

    if (!editorContext) {
      setProcessingMatrix(false);
      return;
    }

    try {
      const graph = editorContext.graph ? { ...editorContext.graph } : null;

      if (graph) {
        try {
          // Attach the parameter matrix to the graph for the code generator to use
          (graph as any).editorContext = {
            parameterMatrix
          };

          // Also set the parameter matrix directly on the editorContext for direct access
          (editorContext as any).parameterMatrix = parameterMatrix;

          setTimeout(() => {
            editorContext.onLiveExecution!();
          }, 100);
        } catch (error) {
          setProcessingMatrix(false);
        }
      } else {
        setProcessingMatrix(false);
      }
    } catch (error) {
      setProcessingMatrix(false);
    }
  }, [buildParameterMatrix, editorContext]);

  // Convert matrix results to gallery images
  const matrixResultsAsGalleryImages = useMemo(() => {
    return matrixResults.map(result => ({
      filename: `result-${result.index}`,
      base64: result.imageUrl,
      params: result.params,
      error: result.error
    }));
  }, [matrixResults]);
  const handleApply = useCallback(() => {
    const newParameterMatrixForDialogProp = buildParameterMatrix();
    setValue?.(forWhom, newParameterMatrixForDialogProp);

    if (
      selectedGalleryImageParams &&
      editorContext?.action('graph')?.setValue &&
      editorContext.graph &&
      editorContext.focus &&
      editorContext.triggerLiveExecution
    ) {
      editorContext.focus(); // Still call this for its side effects (e.g., onFocus handlers)

      for (const [nodeId, paramsForNode] of Object.entries(
        selectedGalleryImageParams
      )) {
        if (typeof paramsForNode === 'object' && paramsForNode !== null) {
          for (const [originalParamId, valueToApply] of Object.entries(
            paramsForNode
          )) {
            if (valueToApply !== undefined) {
              try {
                editorContext
                  .action('graph')
                  .setValue(
                    'inputs',
                    { nodeID: nodeId, id: originalParamId },
                    valueToApply
                  );
              } catch (e) {
                console.error(
                  `[MatrixDialog] Error calling setValue for Node ID: ${nodeId}, Input ID: ${originalParamId}:`,
                  e
                );
              }
            }
          }
        }
      }

      // Clear any existing parameterMatrix from editorContext and graph.editorContext
      // to ensure a single run, not a matrix run.
      if (editorContext) {
        if (
          typeof (editorContext as any).parameterMatrix === 'object' &&
          (editorContext as any).parameterMatrix !== null
        ) {
          (editorContext as any).parameterMatrix = undefined;
        }

        if (editorContext.graph) {
          const graphWithEditorCtx = editorContext.graph as any;
          if (
            graphWithEditorCtx.editorContext &&
            typeof graphWithEditorCtx.editorContext.parameterMatrix ===
              'object' &&
            graphWithEditorCtx.editorContext.parameterMatrix !== null
          ) {
            graphWithEditorCtx.editorContext.parameterMatrix = undefined;
            if (Object.keys(graphWithEditorCtx.editorContext).length === 0) {
              graphWithEditorCtx.editorContext = undefined;
            }
          }
        }
      }

      editorContext.triggerLiveExecution({ bypassFocusCheck: true });
    }

    onClose();
  }, [
    setValue,
    forWhom,
    buildParameterMatrix,
    selectedGalleryImageParams,
    editorContext,
    onClose
  ]);

  // This is GridImageGallery's setValue callback
  const handleGalleryImageSelection = useCallback(
    (
      _galleryForWhom: any,
      selectedData: { filename: string; params: Record<string, any> } | string[]
    ) => {
      if (
        typeof selectedData === 'object' &&
        !Array.isArray(selectedData) &&
        selectedData.params
      ) {
        const selectedParams = selectedData.params;
        setSelectedGalleryImageParams(selectedParams); // Store the params of the selected image

        // Update nodeParameters' displayValue based on selected image's params
        setNodeParameters(prevNodeParameters =>
          prevNodeParameters.map(node => {
            const nodeParamsFromSelection = selectedParams[node.nodeId];
            if (nodeParamsFromSelection) {
              let nodeChanged = false;
              const newParameters = node.parameters.map(param => {
                const paramId = param.id.split('_').pop() || param.id;
                let newDisplayValue: string | undefined = undefined;
                if (nodeParamsFromSelection[paramId] !== undefined) {
                  newDisplayValue = String(nodeParamsFromSelection[paramId]);
                }
                if (newDisplayValue !== param.displayValue) {
                  nodeChanged = true;
                  return { ...param, displayValue: newDisplayValue };
                }
                return param;
              });
              return nodeChanged
                ? { ...node, parameters: newParameters }
                : node;
            } else {
              // Node not in selection, clear its displayValues if any
              let nodeChanged = false;
              const newParameters = node.parameters.map(param => {
                if (param.displayValue !== undefined) {
                  nodeChanged = true;
                  return { ...param, displayValue: undefined };
                }
                return param;
              });
              return nodeChanged
                ? { ...node, parameters: newParameters }
                : node;
            }
          })
        );
      } else {
        // Fallback for simple selection or deselection, clear all display values
        setSelectedGalleryImageParams(null);
        setNodeParameters(prevNodeParameters =>
          prevNodeParameters.map(node => {
            let nodeChanged = false;
            const newParameters = node.parameters.map(param => {
              if (param.displayValue !== undefined) {
                nodeChanged = true;
                return { ...param, displayValue: undefined };
              }
              return param;
            });
            return nodeChanged ? { ...node, parameters: newParameters } : node;
          })
        );
      }
    },
    [] // setNodeParameters and setSelectedGalleryImageParams are stable
  );

  const handleDeleteImage = useCallback(
    (imageIndexToDelete: number) => {
      setMatrixResults(prevResults => {
        if (
          imageIndexToDelete < 0 ||
          imageIndexToDelete >= prevResults.length
        ) {
          return prevResults;
        }
        const updatedResults = prevResults.filter(
          (_, index) => index !== imageIndexToDelete
        );

        // If the deleted image's params were being displayed, clear them
        const deletedImage = prevResults[imageIndexToDelete];
        if (
          deletedImage &&
          selectedGalleryImageParams &&
          JSON.stringify(deletedImage.params) ===
            JSON.stringify(selectedGalleryImageParams)
        ) {
          setSelectedGalleryImageParams(null);
          setNodeParameters(prevNodeParams =>
            prevNodeParams.map(node => {
              let nodeChanged = false;
              const newParameters = node.parameters.map(param => {
                if (param.displayValue !== undefined) {
                  nodeChanged = true;
                  return { ...param, displayValue: undefined };
                }
                return param;
              });
              return nodeChanged
                ? { ...node, parameters: newParameters }
                : node;
            })
          );
        }
        return updatedResults;
      });
    },
    [selectedGalleryImageParams]
  );

  const processingContent = useMemo(() => {
    if (processingMatrix) {
      return (
        <div className="processing-matrix">
          Processing parameter combinations...
          {totalCombinations > 0 && (
            <div className="processing-status">
              {processedCombinations} of {totalCombinations} combinations
              processed
            </div>
          )}
        </div>
      );
    }
    return null;
  }, [processingMatrix, processedCombinations, totalCombinations]);

  return (
    <MatrixDialogPortal onClose={onClose}>
      <div className="matrix-dialog">
        <div className="matrix-dialog-header">
          <h2>Grid Search Parameters</h2>
          <button
            className="close-icon-button"
            onClick={onClose}
            title="Close"
            aria-label="Close dialog"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="matrix-dialog-content">
          {loading ? (
            <div className="loading">Loading parameters...</div>
          ) : (
            <div className="matrix-layout">
              <div className="matrix-parameters-panel">
                {nodeParameters.length === 0 ? (
                  <div className="no-parameters">
                    No numeric parameters found in the workflow.
                  </div>
                ) : (
                  <div className="matrix-parameters">
                    {nodeParameters.map(node => (
                      <div key={node.nodeId} className="node-parameters">
                        <h3>{node.nodeLabel}</h3>
                        <div className="parameters-list">
                          {node.parameters.map(param => (
                            <div
                              key={param.id}
                              className={`parameter-item ${param.readOnly ? 'parameter-readonly' : ''}`}
                            >
                              <label>
                                {param.name}
                                {param.displayValue !== undefined && (
                                  <span
                                    className="selected-param-value"
                                    title="Selected value"
                                  >
                                    {param.displayValue}
                                  </span>
                                )}
                              </label>
                              {param.type === 'number' ? (
                                <NumericParameterInput
                                  param={param}
                                  onChange={val =>
                                    handleValueChange(
                                      node.nodeId,
                                      param.id,
                                      val
                                    )
                                  }
                                  onConfigChange={(configKey, configVal) =>
                                    handleParamConfigChange(
                                      node.nodeId,
                                      param.id,
                                      configKey,
                                      configVal
                                    )
                                  }
                                />
                              ) : param.type === 'enum' ? (
                                <EnumParameterInput
                                  param={param}
                                  onChange={val =>
                                    handleValueChange(
                                      node.nodeId,
                                      param.id,
                                      val
                                    )
                                  }
                                />
                              ) : param.readOnly ? (
                                <ReadOnlyInput param={param} />
                              ) : (
                                <NumberInput
                                  forWhom={{
                                    nodeID: node.nodeId,
                                    id: param.id,
                                    type: 'target'
                                  }}
                                  value={param.value as number}
                                  setValue={(_, val) => {
                                    handleValueChange(
                                      node.nodeId,
                                      param.id,
                                      val
                                    );
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="matrix-gallery-panel">
                {processingContent}
                {!processingMatrix && matrixResults.length === 0 ? (
                  <div className="no-gallery-images">
                    No images available. Click "Run" to generate matrix results.
                  </div>
                ) : matrixResultsAsGalleryImages.length > 0 ? (
                  <GridImageGallery
                    forWhom={{
                      id: 'matrix-gallery',
                      type: 'gallery',
                      nodeID: 'matrix'
                    }}
                    images={matrixResultsAsGalleryImages}
                    setValue={handleGalleryImageSelection}
                    onDeleteImage={handleDeleteImage}
                    editorContext={editorContext}
                  />
                ) : null}
              </div>
            </div>
          )}

          <div className="matrix-dialog-buttons">
            <button
              className="primary-button run-button"
              onClick={executeMatrixCode}
              disabled={processingMatrix || nodeParameters.length === 0}
            >
              Run
            </button>
            <button
              className="apply-button"
              onClick={handleApply}
              disabled={loading || nodeParameters.length === 0}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </MatrixDialogPortal>
  );
}
