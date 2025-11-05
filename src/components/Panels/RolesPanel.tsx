import React, { useState, useEffect } from 'react';
import { Role, Permission, RoleFormData, User, UserFormData } from '../../types/dashboard';
import { toast } from 'react-hot-toast';
import { Users, Plus, Edit, Trash2, Search, UserCheck, UserX, Mail, Phone } from 'lucide-react';

const RolesPanel: React.FC = () => {
  // Role management state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: [],
    level: 3
  });

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>({ 
    name: '', 
    email: '', 
    phone: '', 
    role: '', 
    department: 'Operations', 
    status: 'active', 
    password: '' 
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');

  useEffect(() => {
    console.log('RolesPanel mounted, fetching data...');
    fetchRoles();
    fetchPermissions();
    fetchUsers();
  }, []);

  // Role management functions
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching roles with token:', token ? 'Token exists' : 'No token');
      
      // Try the main roles endpoint first
      let response = await fetch('http://localhost:3001/roles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Roles response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Roles data:', data);
        setRoles(data);
      } else {
        console.log('Main roles endpoint failed, trying public endpoint...');
        // Fallback to public endpoint
        response = await fetch('http://localhost:3001/auth/roles');
        
        if (response.ok) {
          const data = await response.json();
          console.log('Public roles data:', data);
          // Transform the data to match the expected format
          const transformedRoles = data.map((role: any) => ({
            ...role,
            permissions: [], // Public endpoint doesn't include permissions
            isActive: true,
            isSystem: true
          }));
          setRoles(transformedRoles);
        } else {
          const errorText = await response.text();
          console.error('Both roles endpoints failed:', errorText);
          toast.error('Failed to fetch roles');
        }
      }
    } catch (error) {
      console.error('Roles fetch exception:', error);
      toast.error('Error fetching roles');
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/permissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      } else {
        toast.error('Failed to fetch permissions');
      }
    } catch (error) {
      toast.error('Error fetching permissions');
    } finally {
      setLoading(false);
    }
  };

  // User management functions
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching users with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch('http://localhost:3001/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Users response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data:', data);
        const mapped: User[] = data.map((u: any) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.role,
          status: ((u.status || (u.isActive ? 'active' : 'inactive')) as 'active'|'inactive'),
          lastLogin: u.lastLogin || u.updatedAt || u.createdAt,
          createdAt: u.createdAt,
          department: u.department || ''
        }));
        setUsers(mapped);
      } else {
        const errorText = await response.text();
        console.error('Users fetch error:', errorText);
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Users fetch exception:', error);
      toast.error('Error fetching users');
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('auth_token');
      const url = editingRole 
        ? `http://localhost:3001/roles/${editingRole._id}`
        : 'http://localhost:3001/roles';
      
      const method = editingRole ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleFormData)
      });
      
      if (response.ok) {
        toast.success(editingRole ? 'Role updated successfully' : 'Role created successfully');
        setShowRoleModal(false);
        setEditingRole(null);
        resetRoleForm();
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Error saving role');
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!userFormData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!userFormData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!userFormData.role) {
      toast.error('Role is required');
      return;
    }
    if (!editingUser && (!userFormData.password || !userFormData.password.trim())) {
      toast.error('Password is required for new users');
      return;
    }
    if (!editingUser && userFormData.password && userFormData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (editingUser) {
        const response = await fetch(`http://localhost:3001/users/${editingUser._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            name: userFormData.name.trim(), 
            email: userFormData.email.trim(), 
            phone: userFormData.phone.trim(), 
            role: userFormData.role, 
            department: userFormData.department.trim(), 
            status: userFormData.status 
          })
        });
        
        if (response.ok) {
          toast.success('User updated successfully');
          setShowUserModal(false);
          setEditingUser(null);
          resetUserForm();
          fetchUsers();
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || 'Failed to update user');
        }
      } else {
        const response = await fetch('http://localhost:3001/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            name: userFormData.name.trim(), 
            email: userFormData.email.trim(), 
            phone: userFormData.phone.trim(), 
            role: userFormData.role, 
            department: userFormData.department.trim(), 
            password: userFormData.password || ''
          })
        });
        
        if (response.ok) {
          toast.success('User created successfully');
          setShowUserModal(false);
          resetUserForm();
          fetchUsers();
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || 'Failed to create user');
        }
      }
    } catch (error) {
      toast.error('Error saving user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        toast.success('Role deleted successfully');
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete role');
      }
    } catch (error) {
      toast.error('Error deleting role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      toast.error('Error deleting user');
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p._id),
      level: role.level
    });
    setShowRoleModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role._id,
      department: user.department,
      status: user.status,
      password: ''
    });
    setShowUserModal(true);
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const user = users.find(u => u._id === userId);
      if (!user) return;
      
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      const response = await fetch(`http://localhost:3001/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setUsers(prev => prev.map(u => 
          u._id === userId ? { ...u, status: newStatus } : u
        ));
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      } else {
        toast.error('Failed to update user status');
      }
    } catch (error) {
      toast.error('Error updating user status');
    }
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      description: '',
      permissions: [],
      level: 3
    });
  };

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      department: 'Operations',
      status: 'active',
      password: ''
    });
  };

  const openCreateRoleModal = () => {
    setEditingRole(null);
    resetRoleForm();
    setShowRoleModal(true);
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    resetUserForm();
    setShowUserModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setEditingRole(null);
    resetRoleForm();
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    resetUserForm();
  };

  const togglePermission = (permissionId: string) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredUsers = (users || []).filter(user => {
    if (!user || !user.name || !user.email || !user.role) {
      console.warn('Invalid user data:', user);
      return false;
    }
    
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || (user.role && user.role.name === selectedRole);
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: Role) => {
    switch (role.name) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role & User Management</h2>
          <p className="text-gray-600">Manage user roles, permissions, and user accounts</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Management
          </button>
        </nav>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Role Management</h3>
            <button
              onClick={openCreateRoleModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Role
            </button>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div key={role._id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    {role.isSystem && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        System
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      role.isActive 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {role.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Level: {role.level}</span>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions ({role.permissions.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 5).map((permission) => (
                      <span key={permission._id} className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                        {permission.action}
                      </span>
                    ))}
                    {role.permissions.length > 5 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{role.permissions.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditRole(role)}
                    disabled={role.isSystem}
                    className={`px-3 py-1 text-sm rounded ${
                      role.isSystem
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role._id)}
                    disabled={role.isSystem}
                    className={`px-3 py-1 text-sm rounded ${
                      role.isSystem
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {(() => { console.log('Rendering users tab, users count:', users?.length || 0); return null; })()}
          
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          )}
          
          {!loading && users && users.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found. Create your first user to get started.</p>
            </div>
          )}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            <button
              onClick={openCreateUserModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                                <p className="text-2xl font-bold text-gray-900">
                {(users || []).filter(u => u.status === 'active').length}
              </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                                <p className="text-2xl font-bold text-gray-900">
                {(users || []).filter(u => u.role && u.role.name === 'admin').length}
              </p>
                </div>
                <UserCheck className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive Users</p>
                                <p className="text-2xl font-bold text-gray-900">
                {(users || []).filter(u => u.status === 'inactive').length}
              </p>
                </div>
                <UserX className="h-8 w-8 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  {roles.map(role => (
                    <option key={role._id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers && filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">ID: {user._id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-900">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {user.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                            {user.role.name.charAt(0).toUpperCase() + user.role.name.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleUserStatus(user._id)}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}
                          >
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(user.lastLogin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="text-red-600 hover:text-red-900 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
              <button
                onClick={closeRoleModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={roleFormData.level}
                    onChange={(e) => setRoleFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="border border-gray-300 rounded-md p-4 max-h-64 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                    <div key={resource} className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                        {resource}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {resourcePermissions.map((permission) => (
                          <label key={permission._id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={roleFormData.permissions.includes(permission._id)}
                              onChange={() => togglePermission(permission._id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600">
                              {permission.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={closeUserModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input 
                    value={userFormData.name} 
                    onChange={(e) => setUserFormData(f => ({ ...f, name: e.target.value }))} 
                    placeholder="Enter full name" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input 
                    value={userFormData.email} 
                    onChange={(e) => setUserFormData(f => ({ ...f, email: e.target.value }))} 
                    placeholder="Enter email address" 
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input 
                    type="password" 
                    value={userFormData.password} 
                    onChange={(e) => setUserFormData(f => ({ ...f, password: e.target.value }))} 
                    placeholder="Enter password (min 6 characters)" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input 
                    value={userFormData.phone} 
                    onChange={(e) => setUserFormData(f => ({ ...f, phone: e.target.value }))} 
                    placeholder="Enter phone number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select 
                    value={userFormData.department} 
                    onChange={(e) => setUserFormData(f => ({ ...f, department: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select department</option>
                    <option value="Operations">Operations</option>
                    <option value="Customer Service">Customer Service</option>
                    <option value="IT">IT</option>
                    <option value="Finance">Finance</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                    <option value="Management">Management</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select 
                    value={userFormData.role} 
                    onChange={(e) => setUserFormData(f => ({ ...f, role: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a role</option>
                    {roles
                      .sort((a, b) => b.level - a.level) // Sort by level (highest first)
                      .map(role => (
                        <option key={role._id} value={role._id}>
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)} - {role.description}
                        </option>
                      ))}
                  </select>
                  {userFormData.role && (
                    <div className="mt-1 text-xs text-gray-600">
                      {(() => {
                        const selectedRole = roles.find(r => r._id === userFormData.role);
                        if (selectedRole) {
                          const permissionCount = selectedRole.permissions.length;
                          return `${selectedRole.name.charAt(0).toUpperCase() + selectedRole.name.slice(1)} role has ${permissionCount} permissions`;
                        }
                        return '';
                      })()}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select 
                    value={userFormData.status} 
                    onChange={(e) => setUserFormData(f => ({ ...f, status: e.target.value as 'active'|'inactive' }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPanel;
