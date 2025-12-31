import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Search, Github, Share2, ExternalLink, Code, AlertCircle, Copy, Check, Key, Linkedin, Instagram } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#FF6B6B'];

export default function App() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [repoCount, setRepoCount] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // URL params handling to allow sharing ?user=username
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const userParam = params.get('user');
      if (userParam) {
        setUsername(userParam);
        fetchData(userParam);
      }
    } catch (e) {
      console.log("Could not parse URL parameters:", e);
    }
  }, []);

  const fetchData = async (userToFetch = username) => {
    if (!userToFetch?.trim()) {
      setError("Please enter a GitHub username first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const headers = { Accept: 'application/vnd.github+json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Fetch all public repos with pagination (GitHub caps at 100 per page)
      const perPage = 100;
      let page = 1;
      let allRepos = [];

      while (true) {
        const response = await fetch(`https://api.github.com/users/${userToFetch}/repos?per_page=${perPage}&sort=updated&page=${page}`, { headers });
        
        if (!response.ok) {
          if (response.status === 404) throw new Error("User not found. Check the username.");
          if (response.status === 403) throw new Error("API Rate limit exceeded. Wait a while or add a GitHub Token below.");
          if (response.status === 401) throw new Error("Invalid GitHub Token.");
          throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
        }

        const repos = await response.json();
        allRepos = allRepos.concat(repos);

        // Stop if we received fewer than a full page or after a safe max of 10 pages to prevent runaway loops
        if (repos.length < perPage || page >= 10) break;
        page += 1;
      }

      setRepoCount(allRepos.length);

      if (allRepos.length === 0) {
        throw new Error("No public repositories found for this user.");
      }

      const langMap = {};
      let hasLang = false;
      allRepos.forEach(repo => {
        if (repo.language) {
          langMap[repo.language] = (langMap[repo.language] || 0) + 1;
          hasLang = true;
        }
      });

      if (!hasLang) {
         throw new Error("Repositories found, but no language data detected.");
      }

      const processedData = Object.keys(langMap)
        .map(lang => ({ name: lang, value: langMap[lang] }))
        .sort((a, b) => b.value - a.value);

      setData(processedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    try {
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('user', username);
      window.history.pushState({}, '', newUrl);
    } catch (err) {
      // Ignore history errors
    }
    fetchData();
  };

  const handleExample = () => {
    setUsername('torvalds');
    fetchData('torvalds');
  };

  const generateMarkdown = () => {
    let appUrl = '';
    try {
      // If running on actual site, use current URL
      if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('sandbox')) {
         appUrl = window.location.href.split('?')[0] + `?user=${username}`;
      } else {
         throw new Error("Local/Sandbox");
      }
    } catch (e) {
      // Fallback for when copying link from localhost or sandbox
      appUrl = `https://gunjan-ghangare.github.io/GitHub-Lang-Detector/?user=${username}`;
    }
    return `[![My Top Languages](https://img.shields.io/badge/View%20My-Top%20Languages-blue?style=for-the-badge&logo=github)](${appUrl})`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 flex flex-col">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12 text-center w-full">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Github className="w-10 h-10 text-blue-400" />
          <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            GitLang Detector
          </h1>
        </div>
        <p className="text-slate-400 text-lg">
          Analyze your GitHub repository language usage instantly.
        </p>
      </div>

      {/* Search Section */}
      <div className="max-w-xl mx-auto mb-12 w-full">
        <form onSubmit={handleSearch} className="relative group z-10">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col gap-2 bg-slate-800 rounded-lg p-2">
            <div className="flex gap-2">
                <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter GitHub Username..."
                className="flex-1 bg-transparent border-none outline-none text-white px-4 py-2 placeholder-slate-500"
                />
                <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                >
                {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                    <>
                    <Search size={18} />
                    Analyze
                    </>
                )}
                </button>
            </div>
          </div>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2">
            <button 
                onClick={handleExample}
                className="text-sm text-slate-400 hover:text-blue-400 underline cursor-pointer transition-colors"
            >
                Try example: torvalds
            </button>
            
            <button 
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
                <Key size={12} />
                {showTokenInput ? "Hide API Token" : "Add API Token (if rate limited)"}
            </button>

            {showTokenInput && (
                <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Paste GitHub Personal Access Token (optional)"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:border-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 text-center">
                        Token is only used for this session and not stored.
                    </p>
                </div>
            )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-200">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {data && (
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Chart Card 1: Pie */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                Language Distribution
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart Card 2: Bar */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                Repo Count by Language
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                    <RechartsTooltip
                      cursor={{fill: '#334155'}}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-xl shadow-lg">
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Top Language</p>
              <p className="text-3xl font-bold mt-1">{data[0]?.name || 'N/A'}</p>
              <p className="text-blue-200 text-xs mt-2">Most frequently used primary language</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-xl shadow-lg">
              <p className="text-purple-200 text-sm font-medium uppercase tracking-wider">Total Repos Analyzed</p>
              <p className="text-3xl font-bold mt-1">{repoCount}</p>
              <p className="text-purple-200 text-xs mt-2">Public repositories fetched</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-xl shadow-lg">
              <p className="text-emerald-200 text-sm font-medium uppercase tracking-wider">Diversity Score</p>
              <p className="text-3xl font-bold mt-1">{data.length}</p>
              <p className="text-emerald-200 text-xs mt-2">Different languages used</p>
            </div>
          </div>

          {/* Profile Embed Section */}
          <div className="mt-12 bg-slate-900 border border-slate-700 rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Share2 className="text-blue-400" size={24} />
                  Add to your GitHub Profile
                </h3>
                <p className="text-slate-400 mt-2 max-w-2xl">
                  Want to show off these stats? Copy the code below and paste it into your profile 
                  <code className="bg-slate-800 px-2 py-0.5 rounded mx-1 text-blue-300">README.md</code>.
                  It creates a badge linking directly to this live dashboard.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <div className="relative bg-black rounded-lg p-4 font-mono text-sm text-slate-300 overflow-x-auto border border-slate-800 flex justify-between items-center">
                <code className="whitespace-pre-wrap break-all mr-4">
                  {generateMarkdown()}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-md transition-all flex-shrink-0"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
               <span className="flex items-center gap-1">
                 <Code size={14} />
                 Note: This generates a static badge link, not a dynamic image.
               </span>
               <span className="flex items-center gap-1">
                 <ExternalLink size={14} />
                 The link points to this URL with your username pre-filled.
               </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Creator Section & Footer */}
      <div className="mt-auto pt-20">
        <div className="max-w-6xl mx-auto border-t border-slate-800 pt-8 pb-12 flex flex-col items-center">
            
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6">
            Meet the Creator
          </h3>
          
          <div className="flex items-center gap-8 mb-6">
            <a 
              href="https://github.com/gunjan-ghangare" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-colors"
              title="GitHub"
            >
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors transform group-hover:scale-110 duration-200">
                <Github size={24} />
              </div>
              <span className="text-xs">GitHub</span>
            </a>

            <a 
              href="https://linkedin.com/in/gunjanghangare" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors"
              title="LinkedIn"
            >
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors transform group-hover:scale-110 duration-200">
                <Linkedin size={24} />
              </div>
              <span className="text-xs">LinkedIn</span>
            </a>

            <a 
              href="https://instagram.com/gunjanghangare_" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors"
              title="Instagram"
            >
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors transform group-hover:scale-110 duration-200">
                <Instagram size={24} />
              </div>
              <span className="text-xs">Instagram</span>
            </a>
          </div>

          <p className="text-slate-500 text-sm">
            Designed & Built by <span className="text-slate-300 font-medium">Gunjan Ghangare</span>
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Copyright © {new Date().getFullYear()} Gunjan Ghangare. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
