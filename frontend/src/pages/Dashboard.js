import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  LogOut, 
  Trash2, 
  File, 
  Loader2, 
  Home, 
  FileText, 
  StickyNote, 
  Settings as SettingsIcon,
  Copy,
  Menu,
  X,
  Download,
  Grid3x3,
  List,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FilePdf,
  BarChart3,
  Cloud,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Settings from './Settings';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Get greeting based on time of day
const getGreeting = () => {
  const now = new Date();
  const calcuttaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Calcutta' }));
  const hour = calcuttaTime.getHours();
  
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const Dashboard = () => {
  const { token, user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Active section
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Files state
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileViewMode, setFileViewMode] = useState('grid'); // 'grid' or 'list'
  const [previewFile, setPreviewFile] = useState(null);

  // Storage stats
  const [storageStats, setStorageStats] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Text storage state
  const [texts, setTexts] = useState([]);
  const [textsLoading, setTextsLoading] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [savingText, setSavingText] = useState(false);

  // General state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [greeting] = useState(getGreeting());

  // Get display name
  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    if (user?.phoneNumber) return user.phoneNumber;
    return 'User';
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Fetch data on section change
  useEffect(() => {
    if (isAuthenticated) {
      if (activeSection === 'myfiles' || activeSection === 'dashboard' || activeSection === 'storage') {
        fetchFiles();
      }
      if (activeSection === 'notes' || activeSection === 'dashboard') {
        fetchNotes();
      }
      if (activeSection === 'textstorage' || activeSection === 'dashboard') {
        fetchTexts();
      }
      if (activeSection === 'dashboard' || activeSection === 'storage') {
        fetchStorageStats();
      }
      if (activeSection === 'analytics') {
        fetchAnalytics();
      }
    }
  }, [activeSection, isAuthenticated]);

  // Fetch files
  const fetchFiles = async () => {
    setFilesLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Fetch files error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/');
      }
    } finally {
      setFilesLoading(false);
    }
  };

  // Fetch storage stats
  const fetchStorageStats = async () => {
    setStorageLoading(true);
    
    try {
      const response = await axios.get(`${API}/storage/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStorageStats(response.data);
    } catch (error) {
      console.error('Fetch storage stats error:', error);
    } finally {
      setStorageLoading(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    
    try {
      const response = await axios.get(`${API}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Fetch analytics error:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch notes
  const fetchNotes = async () => {
    setNotesLoading(true);
    
    try {
      const response = await axios.get(`${API}/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Fetch notes error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/');
      }
    } finally {
      setNotesLoading(false);
    }
  };

  // Fetch texts
  const fetchTexts = async () => {
    setTextsLoading(true);
    
    try {
      const response = await axios.get(`${API}/texts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTexts(response.data.texts || []);
    } catch (error) {
      console.error('Fetch texts error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/');
      }
    } finally {
      setTextsLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await axios.post(`${API}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setSuccess('File uploaded successfully!');
      setSelectedFile(null);
      document.getElementById('file-input').value = '';
      await fetchFiles();
      await fetchStorageStats();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file delete
  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;

    try {
      await axios.delete(`${API}/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('File deleted successfully!');
      await fetchFiles();
      await fetchStorageStats();
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.detail || 'Delete failed');
    }
  };

  // Handle file download
  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const response = await axios.get(`${API}/files/download/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download error:', error);
      setError('Download failed');
    }
  };

  // Handle file preview
  const handlePreviewFile = (file) => {
    setPreviewFile(file);
  };

  // Handle save note
  const handleSaveNote = async (e) => {
    e.preventDefault();
    setSavingNote(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${API}/notes`,
        { title: noteTitle, content: noteContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Note saved successfully!');
      setNoteTitle('');
      setNoteContent('');
      await fetchNotes();
    } catch (error) {
      console.error('Save note error:', error);
      setError(error.response?.data?.detail || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  // Handle delete note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      await axios.delete(`${API}/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Note deleted successfully!');
      await fetchNotes();
    } catch (error) {
      console.error('Delete note error:', error);
      setError(error.response?.data?.detail || 'Delete failed');
    }
  };

  // Handle save text
  const handleSaveText = async (e) => {
    e.preventDefault();
    setSavingText(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${API}/texts`,
        { title: textTitle, content: textContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Text saved successfully!');
      setTextTitle('');
      setTextContent('');
      await fetchTexts();
    } catch (error) {
      console.error('Save text error:', error);
      setError(error.response?.data?.detail || 'Failed to save text');
    } finally {
      setSavingText(false);
    }
  };

  // Handle delete text
  const handleDeleteText = async (textId) => {
    if (!window.confirm('Delete this text?')) return;

    try {
      await axios.delete(`${API}/texts/${textId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Text deleted successfully!');
      await fetchTexts();
    } catch (error) {
      console.error('Delete text error:', error);
      setError(error.response?.data?.detail || 'Delete failed');
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get file icon
  const getFileIcon = (fileType) => {
    if (fileType.includes('image')) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (fileType.includes('video')) return <FileVideo className="h-8 w-8 text-purple-500" />;
    if (fileType.includes('audio')) return <FileAudio className="h-8 w-8 text-green-500" />;
    if (fileType.includes('pdf')) return <FilePdf className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'myfiles', icon: File, label: 'My Files' },
    { id: 'storage', icon: Cloud, label: 'Storage' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'notes', icon: StickyNote, label: 'Notes' },
    { id: 'textstorage', icon: FileText, label: 'Text Storage' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  // Storage Quota Component
  const StorageQuotaCard = () => {
    if (!storageStats) return null;

    const percentageUsed = storageStats.percentageUsed || 0;
    const usedGB = (storageStats.storageUsed / (1024 * 1024 * 1024)).toFixed(2);
    const totalGB = (storageStats.storageLimit / (1024 * 1024 * 1024)).toFixed(0);

    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-600" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-blue-600">{usedGB}</span>
            <span className="text-2xl text-gray-500 mb-1">/ {totalGB} GB</span>
          </div>
          <Progress value={percentageUsed} className="h-3" />
          <p className="text-sm text-gray-600">
            {percentageUsed.toFixed(1)}% used • {formatFileSize(storageStats.storageRemaining)} remaining
          </p>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{storageStats.fileCount}</p>
              <p className="text-xs text-gray-600">Files</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{storageStats.notesCount}</p>
              <p className="text-xs text-gray-600">Notes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{storageStats.textsCount}</p>
              <p className="text-xs text-gray-600">Texts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200 shadow-lg
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo / Title */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <img src="/ecoleaf-logo.png" alt="Ecoleaf Cloud" className="h-10 w-10 rounded-lg bg-white p-1" />
              <div>
                <h1 className="text-xl font-bold text-white">Ecoleaf Cloud</h1>
                <p className="text-xs text-blue-100">Secure Storage</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${activeSection === item.id
                    ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Greeting */}
            <div className="flex-1 md:flex-none">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                {greeting}, {getDisplayName()}! 👋
              </h2>
              <p className="text-sm text-gray-600 hidden md:block">
                Welcome back to Ecoleaf Cloud
              </p>
            </div>

            {/* User Info */}
            <div className="hidden md:flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium">{user?.email || user?.phoneNumber}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Global Alerts */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-500 bg-green-50">
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Dashboard Overview</h3>
                <p className="text-gray-600 mt-1">Your cloud storage at a glance</p>
              </div>

              {/* Storage Quota */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <StorageQuotaCard />
                </div>

                {/* Quick Stats */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Files</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-blue-600">{files.length}</p>
                      <p className="text-xs text-gray-500 mt-1">Uploaded files</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-green-600">{notes.length}</p>
                      <p className="text-xs text-gray-500 mt-1">Saved notes</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Text Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-purple-600">{texts.length}</p>
                      <p className="text-xs text-gray-500 mt-1">Text snippets</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Recent Files */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Files</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSection('myfiles')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {filesLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center py-8">
                      <File className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-4">No files uploaded yet</p>
                      <Button onClick={() => setActiveSection('upload')}>
                        Upload Your First File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.slice(0, 5).map((file) => (
                        <div key={file._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getFileIcon(file.fileType)}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{file.originalName}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {formatDate(file.uploadedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upload Section */}
          {activeSection === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Upload Files</h3>
                <p className="text-gray-600 mt-1">Upload your files securely to Ecoleaf Cloud</p>
              </div>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>File Upload</CardTitle>
                  <CardDescription>Select a file to upload (Max 50MB)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <Input
                      id="file-input"
                      type="file"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="mb-4"
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-600 mb-4">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handleUpload} 
                    disabled={!selectedFile || uploading}
                    className="w-full"
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </>
                    )}
                  </Button>
                  
                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="w-full h-2" />
                      <p className="text-sm text-gray-600 text-center">
                        Uploading: {uploadProgress}%
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* My Files Section - WITH GRID/LIST VIEW AND PREVIEWS */}
          {activeSection === 'myfiles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">My Files</h3>
                  <p className="text-gray-600 mt-1">View and manage your uploaded files</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={fileViewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFileViewMode('grid')}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={fileViewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFileViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {filesLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-400" />
                </div>
              ) : files.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <File className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-4">No files uploaded yet</p>
                      <Button onClick={() => setActiveSection('upload')}>
                        Upload Your First File
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Grid View */}
                  {fileViewMode === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {files.map((file) => (
                        <Card key={file._id} className="hover:shadow-lg transition-shadow group">
                          <CardContent className="p-4">
                            {/* File Icon/Preview */}
                            <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                              {file.fileType.includes('image') ? (
                                <img 
                                  src={`${BACKEND_URL}${file.fileUrl}`} 
                                  alt={file.originalName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getFileIcon(file.fileType)
                              )}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handlePreviewFile(file)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleDownloadFile(file._id, file.originalName)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* File Info */}
                            <p className="font-medium text-sm truncate mb-1">{file.originalName}</p>
                            <p className="text-xs text-gray-500 mb-2">{formatFileSize(file.fileSize)}</p>
                            <p className="text-xs text-gray-400">{formatDate(file.uploadedAt)}</p>
                            
                            {/* Actions */}
                            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadFile(file._id, file.originalName)}
                                className="flex-1"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteFile(file._id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* List View */}
                  {fileViewMode === 'list' && (
                    <Card>
                      <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                          {files.map((file) => (
                            <div key={file._id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex-shrink-0">
                                {getFileIcon(file.fileType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{file.originalName}</p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(file.fileSize)} • {formatDate(file.uploadedAt)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePreviewFile(file)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadFile(file._id, file.originalName)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteFile(file._id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* Storage Section */}
          {activeSection === 'storage' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Storage Management</h3>
                <p className="text-gray-600 mt-1">Monitor your storage usage and quota</p>
              </div>

              {storageLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-400" />
                </div>
              ) : storageStats ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Storage Quota */}
                  <StorageQuotaCard />

                  {/* Storage Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Storage Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(storageStats.storageByType || {}).map(([type, size]) => (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">{type}</span>
                              <span className="text-sm text-gray-600">{formatFileSize(size)}</span>
                            </div>
                            <Progress 
                              value={(size / storageStats.storageUsed) * 100} 
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">Unable to load storage stats</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Analytics Section - WITH CHARTS */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Analytics & Statistics</h3>
                <p className="text-gray-600 mt-1">Insights into your cloud storage usage</p>
              </div>

              {analyticsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-400" />
                </div>
              ) : analytics ? (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600">Total Files</p>
                        <p className="text-3xl font-bold text-blue-600">{analytics.totalFiles}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600">Total Storage</p>
                        <p className="text-3xl font-bold text-green-600">{formatFileSize(analytics.totalStorage)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600">Notes</p>
                        <p className="text-3xl font-bold text-purple-600">{analytics.notesCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600">Texts</p>
                        <p className="text-3xl font-bold text-orange-600">{analytics.textsCount}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* File Type Distribution - Pie Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>File Types Distribution</CardTitle>
                        <CardDescription>Breakdown by file categories</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={Object.entries(analytics.fileTypeDistribution || {}).map(([name, value]) => ({ name, value }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {Object.keys(analytics.fileTypeDistribution || {}).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#6b7280'][index % 6]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Upload Trends - Area Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Upload Trends (Last 30 Days)</CardTitle>
                        <CardDescription>Storage uploaded over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={analytics.uploadTrends || []}>
                            <defs>
                              <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatFileSize(value)} />
                            <Tooltip 
                              formatter={(value) => formatFileSize(value)}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Area type="monotone" dataKey="size" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSize)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* File Count by Day - Bar Chart */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>Upload Activity (Last 30 Days)</CardTitle>
                        <CardDescription>Number of files uploaded per day</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.uploadTrends || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              labelFormatter={(label) => `Date: ${label}`}
                              formatter={(value) => [`${value} files`, 'Uploads']}
                            />
                            <Legend />
                            <Bar dataKey="count" name="Files Uploaded" fill="#10b981" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">Unable to load analytics data</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Notes Section - Continue with existing implementation */}
          {activeSection === 'notes' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Notes</h3>
                <p className="text-gray-600 mt-1">Create and manage your notes</p>
              </div>

              {/* Create Note */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Create Note</CardTitle>
                  <CardDescription>Write a quick note</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveNote} className="space-y-4">
                    <Input
                      placeholder="Note title"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      required
                    />
                    <Textarea
                      placeholder="Note content..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows={6}
                      required
                    />
                    <Button type="submit" disabled={savingNote} className="w-full">
                      {savingNote ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Note'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Notes List */}
              <div>
                <h4 className="text-lg font-semibold mb-4">All Notes ({notes.length})</h4>
                {notesLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : notes.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <StickyNote className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No notes yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notes.map((note) => (
                      <Card key={note._id} className="hover:shadow-lg transition-shadow relative">
                        <CardHeader>
                          <CardTitle className="text-lg pr-8">{note.title}</CardTitle>
                          <CardDescription className="text-xs">
                            {formatDate(note.updatedAt)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                            {note.content}
                          </p>
                        </CardContent>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-4 right-4"
                          onClick={() => handleDeleteNote(note._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text Storage Section */}
          {activeSection === 'textstorage' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Text Storage</h3>
                <p className="text-gray-600 mt-1">Store and manage large text snippets</p>
              </div>

              {/* Save Text */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Save Text</CardTitle>
                  <CardDescription>Store long text, code, or any content</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveText} className="space-y-4">
                    <Input
                      placeholder="Text title"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      required
                    />
                    <Textarea
                      placeholder="Paste your text content here..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={10}
                      required
                    />
                    <Button type="submit" disabled={savingText} className="w-full">
                      {savingText ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Text'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Texts List */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Saved Texts ({texts.length})</h4>
                {textsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : texts.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No text saved yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {texts.map((text) => (
                      <Card key={text._id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{text.title}</CardTitle>
                              <CardDescription className="text-xs">
                                {formatDate(text.updatedAt)}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(text.content)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteText(text._id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded max-h-64 overflow-auto">
                            {text.content}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && <Settings />}
        </main>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold truncate flex-1">{previewFile.originalName}</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewFile(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              {previewFile.fileType.includes('image') ? (
                <img 
                  src={`${BACKEND_URL}${previewFile.fileUrl}`} 
                  alt={previewFile.originalName}
                  className="max-w-full max-h-[70vh] mx-auto"
                />
              ) : previewFile.fileType.includes('pdf') ? (
                <iframe
                  src={`${BACKEND_URL}${previewFile.fileUrl}`}
                  className="w-full h-[70vh]"
                  title={previewFile.originalName}
                />
              ) : (
                <div className="text-center py-12">
                  {getFileIcon(previewFile.fileType)}
                  <p className="text-gray-600 mt-4">Preview not available for this file type</p>
                  <Button 
                    onClick={() => handleDownloadFile(previewFile._id, previewFile.originalName)}
                    className="mt-4"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
