new Vue({
  el: '#app',
  data: {
    currentUser: null,
    sessionId: null,
    showLogin: false,
    currentView: 'test', // Controls page view
    loginForm: {
      name: '',
      email: '',
      password: ''
    },
    documents: [],
    trash: [],
    searchTerm: '',
    showEditModal: false,
    showPreviewModal: false,
    previewSrc: '',
    editForm: {
      docId: '',
      dateCreated: '',
      signatory: '',
      docRef: null
    },
    showTrash: false,
    folders: []
  },
  computed: {
    filteredDocuments() {
      const docs = this.showTrash ? this.trash : this.documents;
      if (!this.searchTerm) return docs;
      const term = this.searchTerm.toLowerCase();
      return docs.filter(doc =>
        doc.metadata.fileName.toLowerCase().includes(term) ||
        doc.metadata.docId.toLowerCase().includes(term) ||
        doc.metadata.dateCreated.toLowerCase().includes(term) ||
        doc.metadata.signatory.toLowerCase().includes(term) ||
        doc.metadata.students.join(', ').toLowerCase().includes(term) ||
        doc.metadata.staffs.join(', ').toLowerCase().includes(term)
      );
    }
  },
  created() {
    setInterval(() => {
      this.purgeTrash();
    }, 60000);
  },
  methods: {
    login() {
      if (this.loginForm.name && this.loginForm.email && this.loginForm.password) {
        this.currentUser = {
          name: this.loginForm.name,
          email: this.loginForm.email
        };
        this.sessionId = 'dummy-session';
        this.showLogin = false;
        this.loginForm = { name: '', email: '', password: '' };
        this.loadDocuments();
      }
    },
    logout() {
      this.currentUser = null;
      this.sessionId = null;
      this.documents = [];
      this.trash = [];
      this.showTrash = false;
    },
    triggerUpload() {
      this.$refs.fileInput.click();
    },
    uploadFile(e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      for (let file of files) {
        const metadata = this.randomPlaceholderMetadata(file.name);
        const doc = {
          docId: Math.random().toString(36).substring(2, 10),
          metadata: metadata,
          owner: this.currentUser.name
        };
        this.documents.push(doc);
      }
      e.target.value = '';
    },
    randomPlaceholderMetadata(fileName) {
      const docId = `${Math.floor(Math.random() * (2781 - 2758 + 1)) + 2758}/QĐ-ĐHVN`;
      const randomDate = new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString().split('T')[0];
      const signatories = ['Hiệu phó Đỗ Đình Đức', 'Hiệu phó Trần Trình Trọng', 'Hiệu phó Nguyễn Ngạc Ngọc', 'Hiệu trưởng Chử Đức Trình'];
      const studentOptions = ['Nguyen Trung Son', 'Tran Thi Hoa', 'Le Van Binh', 'Pham Van Minh'];
      const staffOptions = ['PGS.TS. Pham Manh Thang', 'TS. Nguyen Ngoc Viet', 'Dr. Hoang Van Nam'];
      return {
        fileName,
        docId,
        dateCreated: randomDate,
        signatory: signatories[Math.floor(Math.random() * signatories.length)],
        students: this.getRandomNames(studentOptions, 1, 3),
        staffs: this.getRandomNames(staffOptions, 1, 2)
      };
    },
    getRandomNames(list, min, max) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      return Array.from({ length: num }, () => list[Math.floor(Math.random() * list.length)]);
    },
    loadDocuments() {
      this.documents = [];
      this.trash = [];
    },
    formatNames(names) {
      return names.length <= 1 ? names[0] || '' : `${names[0]}, ... +${names.length - 1}`;
    },
    selectAll() {
      alert('Select all file action triggered');
    },
    openEditModal(docId) {
      const doc = this.showTrash ? this.trash.find(d => d.docId === docId) : this.documents.find(d => d.docId === docId);
      if (doc) {
        this.editForm = { ...doc.metadata, docRef: doc };
        this.showEditModal = true;
      }
    },
    closeEditModal() {
      this.showEditModal = false;
      this.editForm = { docId: '', dateCreated: '', signatory: '', docRef: null };
    },
    saveEdit() {
      if (this.editForm.docRef) {
        Object.assign(this.editForm.docRef.metadata, {
          docId: this.editForm.docId,
          dateCreated: this.editForm.dateCreated,
          signatory: this.editForm.signatory
        });
      }
      this.closeEditModal();
    },
    deleteDocument(docId) {
      const index = this.documents.findIndex(d => d.docId === docId);
      if (index !== -1) {
        let doc = this.documents.splice(index, 1)[0];
        doc.deletedAt = Date.now();
        this.trash.push(doc);
      }
    },
    restoreDocument(docId) {
      const index = this.trash.findIndex(d => d.docId === docId);
      if (index !== -1) {
        let doc = this.trash.splice(index, 1)[0];
        delete doc.deletedAt;
        this.documents.push(doc);
      }
    },
    permanentlyDeleteDocument(docId) {
      this.trash = this.trash.filter(doc => doc.docId !== docId);
    },
    purgeTrash() {
      const now = Date.now();
      const THIRTY_DAYS_MS = 2592000000;
      this.trash = this.trash.filter(doc => (now - doc.deletedAt) < THIRTY_DAYS_MS);
    },
    downloadDocument(docId) {
      alert(`Downloading document: ${docId}`);
    },
    previewDocument(docId) {
      const doc = this.documents.find(d => d.docId === docId);
      if (doc) {
        this.previewSrc = encodeURI(`/uploads/${doc.metadata.fileName}`);
        this.showPreviewModal = true;
      }
    },
    closePreviewModal() {
      this.showPreviewModal = false;
      this.previewSrc = '';
    },
    moveToFolder(docId) {
      const folderName = prompt("Enter folder name:");
      if (folderName) {
        alert(`Document ${docId} moved to folder "${folderName}". (Demo action)`);
      }
    },
    createFolder() {
      const folderName = prompt('Enter folder name:');
      if (folderName) {
        this.folders.push({ id: Math.random().toString(36).substring(2, 10), name: folderName });
      }
    }
  }
});
