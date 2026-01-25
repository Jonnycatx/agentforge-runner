import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Plus,
  Upload,
  FileText,
  Link,
  Code,
  Database,
  Search,
  Trash2,
  RefreshCw,
  BarChart3,
  Settings,
  File,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: "text" | "pdf" | "url" | "markdown" | "code" | "csv";
  status: "pending" | "processing" | "indexed" | "failed";
  size: number;
  chunkCount: number;
  createdAt: string;
  tags: string[];
}

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  chunkCount: number;
  totalSize: number;
  lastUpdated: string;
}

interface KnowledgeBaseManagerProps {
  knowledgeBaseId?: string;
  agentId?: string;
  onSelect?: (kbId: string) => void;
}

const typeIcons: Record<Document["type"], React.ElementType> = {
  text: FileText,
  pdf: File,
  url: Link,
  markdown: FileText,
  code: Code,
  csv: Database,
};

const statusColors: Record<Document["status"], string> = {
  pending: "text-yellow-500",
  processing: "text-blue-500",
  indexed: "text-green-500",
  failed: "text-red-500",
};

const statusIcons: Record<Document["status"], React.ElementType> = {
  pending: Clock,
  processing: RefreshCw,
  indexed: CheckCircle2,
  failed: AlertCircle,
};

export function KnowledgeBaseManager({
  knowledgeBaseId,
  agentId,
  onSelect,
}: KnowledgeBaseManagerProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<string | null>(knowledgeBaseId || null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newKBName, setNewKBName] = useState("");
  const [newKBDescription, setNewKBDescription] = useState("");
  const [uploadType, setUploadType] = useState<Document["type"]>("text");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [loading, setLoading] = useState(false);

  // Mock data for demo
  useEffect(() => {
    setKnowledgeBases([
      {
        id: "kb-1",
        name: "Product Documentation",
        description: "All product docs and guides",
        documentCount: 24,
        chunkCount: 156,
        totalSize: 2456789,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: "kb-2",
        name: "Company Policies",
        description: "HR and company policies",
        documentCount: 12,
        chunkCount: 78,
        totalSize: 1234567,
        lastUpdated: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);

    if (selectedKB) {
      setDocuments([
        {
          id: "doc-1",
          name: "Getting Started Guide.md",
          type: "markdown",
          status: "indexed",
          size: 15234,
          chunkCount: 8,
          createdAt: new Date().toISOString(),
          tags: ["guide", "onboarding"],
        },
        {
          id: "doc-2",
          name: "API Reference.pdf",
          type: "pdf",
          status: "indexed",
          size: 245678,
          chunkCount: 42,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          tags: ["api", "technical"],
        },
        {
          id: "doc-3",
          name: "FAQ Page",
          type: "url",
          status: "processing",
          size: 8765,
          chunkCount: 0,
          createdAt: new Date().toISOString(),
          tags: ["faq"],
        },
      ]);
    }
  }, [selectedKB]);

  const handleCreateKB = () => {
    if (!newKBName.trim()) return;
    
    const newKB: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name: newKBName,
      description: newKBDescription,
      documentCount: 0,
      chunkCount: 0,
      totalSize: 0,
      lastUpdated: new Date().toISOString(),
    };
    
    setKnowledgeBases(prev => [...prev, newKB]);
    setSelectedKB(newKB.id);
    setIsCreating(false);
    setNewKBName("");
    setNewKBDescription("");
  };

  const handleUpload = () => {
    if (!uploadName.trim() || !uploadContent.trim()) return;
    
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: uploadName,
      type: uploadType,
      status: "pending",
      size: uploadContent.length,
      chunkCount: 0,
      createdAt: new Date().toISOString(),
      tags: [],
    };
    
    setDocuments(prev => [...prev, newDoc]);
    setIsUploading(false);
    setUploadName("");
    setUploadContent("");
    
    // Simulate processing
    setTimeout(() => {
      setDocuments(prev => prev.map(d => 
        d.id === newDoc.id ? { ...d, status: "processing" } : d
      ));
    }, 500);
    
    setTimeout(() => {
      setDocuments(prev => prev.map(d => 
        d.id === newDoc.id 
          ? { ...d, status: "indexed", chunkCount: Math.ceil(d.size / 500) } 
          : d
      ));
    }, 2000);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Simulate search results
    setSearchResults([
      {
        chunk: "This is a relevant chunk from the documentation that matches your query...",
        document: "Getting Started Guide.md",
        score: 0.92,
      },
      {
        chunk: "Another relevant section that contains information about your search...",
        document: "API Reference.pdf",
        score: 0.85,
      },
    ]);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const selectedKBData = knowledgeBases.find(kb => kb.id === selectedKB);

  return (
    <div className="flex h-full">
      {/* Sidebar - KB List */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Knowledge Bases</h3>
            </div>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Knowledge Base</DialogTitle>
                  <DialogDescription>
                    Create a new knowledge base to store documents for your agents.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Name</label>
                    <Input
                      value={newKBName}
                      onChange={(e) => setNewKBName(e.target.value)}
                      placeholder="My Knowledge Base"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      value={newKBDescription}
                      onChange={(e) => setNewKBDescription(e.target.value)}
                      placeholder="What kind of documents will this contain?"
                    />
                  </div>
                  <Button onClick={handleCreateKB} className="w-full">
                    Create Knowledge Base
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {knowledgeBases.map(kb => (
              <button
                key={kb.id}
                onClick={() => {
                  setSelectedKB(kb.id);
                  onSelect?.(kb.id);
                }}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  selectedKB === kb.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{kb.name}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                  {kb.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{kb.documentCount} docs</span>
                  <span>{kb.chunkCount} chunks</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedKBData ? (
          <>
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedKBData.name}</h2>
                  <p className="text-muted-foreground">{selectedKBData.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                  <Dialog open={isUploading} onOpenChange={setIsUploading}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Upload className="w-4 h-4 mr-1" />
                        Add Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Document</DialogTitle>
                        <DialogDescription>
                          Upload a document to your knowledge base.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Document Name</label>
                          <Input
                            value={uploadName}
                            onChange={(e) => setUploadName(e.target.value)}
                            placeholder="My Document"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Type</label>
                          <Select value={uploadType} onValueChange={(v) => setUploadType(v as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Plain Text</SelectItem>
                              <SelectItem value="markdown">Markdown</SelectItem>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="code">Code</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {uploadType === "url" ? "URL" : "Content"}
                          </label>
                          <Textarea
                            value={uploadContent}
                            onChange={(e) => setUploadContent(e.target.value)}
                            placeholder={uploadType === "url" ? "https://..." : "Paste content here..."}
                            rows={6}
                          />
                        </div>
                        <Button onClick={handleUpload} className="w-full">
                          <Upload className="w-4 h-4 mr-1" />
                          Add Document
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{selectedKBData.documentCount}</p>
                        <p className="text-xs text-muted-foreground">Documents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Database className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{selectedKBData.chunkCount}</p>
                        <p className="text-xs text-muted-foreground">Chunks</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{formatBytes(selectedKBData.totalSize)}</p>
                        <p className="text-xs text-muted-foreground">Total Size</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(selectedKBData.lastUpdated).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Last Updated</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="documents" className="flex-1 flex flex-col">
              <div className="border-b px-6">
                <TabsList className="h-12">
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="search">Search & Test</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="documents" className="flex-1 p-6 pt-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {documents.map(doc => {
                      const TypeIcon = typeIcons[doc.type];
                      const StatusIcon = statusIcons[doc.status];
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <TypeIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{doc.name}</p>
                              <StatusIcon className={cn("w-4 h-4", statusColors[doc.status])} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="capitalize">{doc.type}</span>
                              <span>{formatBytes(doc.size)}</span>
                              <span>{doc.chunkCount} chunks</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="search" className="flex-1 p-6 pt-4">
                <div className="max-w-2xl mx-auto">
                  <div className="flex gap-2 mb-6">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search your knowledge base..."
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch}>
                      <Search className="w-4 h-4 mr-1" />
                      Search
                    </Button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-medium">Results</h3>
                      {searchResults.map((result, i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary">{result.document}</Badge>
                              <span className="text-sm text-muted-foreground">
                                Score: {(result.score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-sm">{result.chunk}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="flex-1 p-6 pt-4">
                <div className="text-center text-muted-foreground py-12">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics coming soon</p>
                  <p className="text-sm">Track queries, usage patterns, and more</p>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Knowledge Base Selected</h3>
              <p className="text-sm mb-4">Select or create a knowledge base to get started</p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Create Knowledge Base
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
