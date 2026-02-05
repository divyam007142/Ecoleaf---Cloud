import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogOut, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const { token, user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Set initial display name from user data
    if (user?.displayName) {
      setDisplayName(user.displayName);
    } else if (user?.email) {
      // Extract name from email
      setDisplayName(user.email.split('@')[0]);
    } else if (user?.phoneNumber) {
      setDisplayName(user.phoneNumber);
    }
  }, [user]);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await axios.put(
        `${API}/user/profile`,
        { displayName },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Update user in context
      setUser({ ...user, displayName });
      setSuccess('Display name updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
        logout();
        navigate('/');
      } else {
        setError(error.response?.data?.detail || 'Failed to update display name');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your display name and personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <p className="text-sm text-gray-500">
                This name will be displayed in your greeting message
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="text"
                value={user?.email || 'N/A'}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="text"
                value={user?.phoneNumber || 'N/A'}
                disabled
                className="bg-gray-50"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50">
                <AlertDescription className="text-green-700">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>
            Manage your session and account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogout} variant="destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
