import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  Square,
  Plus,
  Save,
  Trash2,
  Settings,
  Zap,
  GitBranch,
  Clock,
  RepeatIcon,
  ArrowRight,
  FileText,
  Mail,
  Database,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Node types
type NodeType = "trigger" | "action" | "condition" | "loop" | "delay" | "end";

interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  nextNodes: string[];
}

interface WorkflowConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface WorkflowBuilderProps {
  onSave?: (workflow: { nodes: WorkflowNode[]; connections: WorkflowConnection[] }) => void;
  initialNodes?: WorkflowNode[];
  initialConnections?: WorkflowConnection[];
}

const nodeIcons: Record<NodeType, React.ElementType> = {
  trigger: Zap,
  action: Play,
  condition: GitBranch,
  loop: RepeatIcon,
  delay: Clock,
  end: Square,
};

const nodeColors: Record<NodeType, string> = {
  trigger: "bg-green-500",
  action: "bg-blue-500",
  condition: "bg-yellow-500",
  loop: "bg-purple-500",
  delay: "bg-orange-500",
  end: "bg-red-500",
};

const actionTypes = [
  { id: "tool", name: "Execute Tool", icon: Settings },
  { id: "agent", name: "Run Agent", icon: Play },
  { id: "api", name: "API Call", icon: Globe },
  { id: "email", name: "Send Email", icon: Mail },
  { id: "file", name: "File Operation", icon: FileText },
  { id: "data", name: "Transform Data", icon: Database },
];

export function WorkflowBuilder({
  onSave,
  initialNodes = [],
  initialConnections = [],
}: WorkflowBuilderProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [connections, setConnections] = useState<WorkflowConnection[]>(initialConnections);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate unique ID
  const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add new node
  const addNode = useCallback((type: NodeType, name: string) => {
    const newNode: WorkflowNode = {
      id: generateId(),
      type,
      name,
      config: {},
      position: { x: 200 + nodes.length * 50, y: 100 + nodes.length * 30 },
      nextNodes: [],
    };
    setNodes(prev => [...prev, newNode]);
    setIsAddingNode(false);
  }, [nodes.length]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  }, [selectedNode]);

  // Connect nodes
  const connectNodes = useCallback((fromId: string, toId: string, label?: string) => {
    if (fromId === toId) return;
    
    // Check if connection already exists
    if (connections.some(c => c.from === fromId && c.to === toId)) return;
    
    const newConnection: WorkflowConnection = {
      id: generateId(),
      from: fromId,
      to: toId,
      label,
    };
    
    setConnections(prev => [...prev, newConnection]);
    
    // Update node's nextNodes
    setNodes(prev => prev.map(n => 
      n.id === fromId 
        ? { ...n, nextNodes: [...n.nextNodes, toId] }
        : n
    ));
    
    setConnectingFrom(null);
  }, [connections]);

  // Update node config
  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n
    ));
  }, []);

  // Handle save
  const handleSave = () => {
    onSave?.({ nodes, connections });
  };

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <div className="flex h-full">
      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative bg-muted/30 overflow-hidden"
        onClick={() => setSelectedNode(null)}
      >
        {/* Connection lines */}
        <svg className="absolute inset-0 pointer-events-none">
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            
            const x1 = fromNode.position.x + 100;
            const y1 = fromNode.position.y + 30;
            const x2 = toNode.position.x;
            const y2 = toNode.position.y + 30;
            
            return (
              <g key={conn.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {conn.label && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 5}
                    fill="hsl(var(--muted-foreground))"
                    fontSize="12"
                    textAnchor="middle"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="hsl(var(--primary))"
              />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const Icon = nodeIcons[node.type];
          return (
            <div
              key={node.id}
              className={cn(
                "absolute w-[180px] bg-card rounded-lg border shadow-sm cursor-move transition-all",
                selectedNode === node.id && "ring-2 ring-primary",
                connectingFrom === node.id && "ring-2 ring-green-500"
              )}
              style={{ left: node.position.x, top: node.position.y }}
              onClick={(e) => {
                e.stopPropagation();
                if (connectingFrom && connectingFrom !== node.id) {
                  connectNodes(connectingFrom, node.id);
                } else {
                  setSelectedNode(node.id);
                }
              }}
            >
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                    nodeColors[node.type]
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{node.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
                  </div>
                </div>
                
                {/* Quick actions */}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingFrom(connectingFrom === node.id ? null : node.id);
                    }}
                  >
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Add a trigger to start building your workflow</p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l bg-card flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b flex items-center justify-between">
          <Dialog open={isAddingNode} onOpenChange={setIsAddingNode}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Node
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Workflow Node</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 pt-4">
                {[
                  { type: "trigger" as NodeType, name: "Trigger", desc: "Start workflow" },
                  { type: "action" as NodeType, name: "Action", desc: "Execute task" },
                  { type: "condition" as NodeType, name: "Condition", desc: "Branch logic" },
                  { type: "loop" as NodeType, name: "Loop", desc: "Iterate items" },
                  { type: "delay" as NodeType, name: "Delay", desc: "Wait time" },
                  { type: "end" as NodeType, name: "End", desc: "Finish workflow" },
                ].map(({ type, name, desc }) => {
                  const Icon = nodeIcons[type];
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => addNode(type, name)}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                        nodeColors[type]
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>

        {/* Node config */}
        <ScrollArea className="flex-1">
          {selectedNodeData ? (
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input
                  value={selectedNodeData.name}
                  onChange={(e) => setNodes(prev => prev.map(n =>
                    n.id === selectedNode ? { ...n, name: e.target.value } : n
                  ))}
                />
              </div>
              
              {selectedNodeData.type === "action" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Action Type</label>
                  <Select
                    value={selectedNodeData.config.actionType || "tool"}
                    onValueChange={(v) => updateNodeConfig(selectedNode!, { actionType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-2">
                            <a.icon className="w-4 h-4" />
                            {a.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedNodeData.type === "trigger" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Trigger Type</label>
                  <Select
                    value={selectedNodeData.config.triggerType || "manual"}
                    onValueChange={(v) => updateNodeConfig(selectedNode!, { triggerType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedNodeData.type === "delay" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Delay (seconds)</label>
                  <Input
                    type="number"
                    value={selectedNodeData.config.delaySeconds || 0}
                    onChange={(e) => updateNodeConfig(selectedNode!, { delaySeconds: parseInt(e.target.value) })}
                  />
                </div>
              )}
              
              {/* Connections */}
              <div>
                <label className="text-sm font-medium mb-2 block">Connected to</label>
                <div className="space-y-1">
                  {selectedNodeData.nextNodes.map(nextId => {
                    const nextNode = nodes.find(n => n.id === nextId);
                    return nextNode ? (
                      <Badge key={nextId} variant="secondary" className="mr-1">
                        {nextNode.name}
                      </Badge>
                    ) : null;
                  })}
                  {selectedNodeData.nextNodes.length === 0 && (
                    <p className="text-xs text-muted-foreground">No connections</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a node to configure</p>
            </div>
          )}
        </ScrollArea>

        {/* Stats */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Nodes:</span>
            <Badge variant="secondary">{nodes.length}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Connections:</span>
            <Badge variant="secondary">{connections.length}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
